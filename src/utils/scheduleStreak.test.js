import { describe, it, expect } from 'vitest';
import { bestScheduleRun, planDays, scheduleStreak } from './scheduleStreak.js';
import { STREAK } from './streak.js';

// 2026-08-03 is a Monday, so the whole file reads in weekdays.
const MON = '2026-08-03';
const TUE = '2026-08-04';
const WED = '2026-08-05';
const THU = '2026-08-06';
const FRI = '2026-08-07';
const SAT = '2026-08-08';
const SUN = '2026-08-09';

/** Mon / Wed / Fri. */
const MWF = new Set([1, 3, 5]);

const run = (dates, today) => scheduleStreak({ plan: MWF, dates, today });

describe('planDays', () => {
  it('collects the weekdays routines are assigned to', () => {
    expect([...planDays([{ dayOfWeek: 1 }, { dayOfWeek: 3 }, { dayOfWeek: 1 }])]).toEqual([1, 3]);
  });

  it('ignores routines with no day, which is most of them', () => {
    expect(planDays([{ dayOfWeek: null }, {}, { dayOfWeek: 'monday' }]).size).toBe(0);
    expect(planDays([{ dayOfWeek: 7 }, { dayOfWeek: -1 }]).size).toBe(0);
  });

  it('survives junk', () => {
    expect(planDays().size).toBe(0);
    expect(planDays(null).size).toBe(0);
  });
});

describe('scheduleStreak', () => {
  it('says nothing at all when there is no plan', () => {
    // The day-streak is the fallback; returning a zero here would silently
    // replace it with a worse answer.
    expect(scheduleStreak({ plan: new Set(), dates: [MON], today: WED })).toBe(null);
    expect(scheduleStreak({})).toBe(null);
  });

  it('does not count a rest day against you', () => {
    // The whole point. Monday trained, Tuesday off by design, and Tuesday is
    // not a lapse — under the day-streak this read as broken.
    const s = run([MON], TUE);
    expect(s.state).toBe(STREAK.SAFE);
    expect(s.count).toBe(1);
  });

  it('counts sessions hit, not days survived', () => {
    const s = run([MON, WED, FRI], FRI);
    expect(s.count).toBe(3);
    expect(s.state).toBe(STREAK.SAFE);
  });

  it('is at risk on a scheduled day you have not trained yet', () => {
    const s = run([MON], WED);
    expect(s.state).toBe(STREAK.AT_RISK);
    expect(s.count).toBe(1);
    expect(s.nextDue).toBe(WED);
  });

  it('says when the open window actually closes', () => {
    // Wednesday's window runs Wed→Thu, so Thursday is the last day that still
    // counts — the difference between "a session is due" and "last chance".
    expect(run([MON], WED).deadline).toBe(THU);
    expect(run([MON], THU).deadline).toBe(THU);
    // Friday's window runs to Sunday.
    expect(run([MON, WED], SAT).deadline).toBe(SUN);
  });

  it('breaks only once a scheduled window has closed unfilled', () => {
    // Wednesday's window runs Wed→Fri, so Wednesday missed is not yet a lapse
    // on Wednesday or Thursday — there is still time to be late. It closes when
    // Friday arrives, and only then is the streak gone.
    expect(run([MON], WED).state).toBe(STREAK.AT_RISK);
    expect(run([MON], THU).state).toBe(STREAK.AT_RISK);
    expect(run([MON], FRI).state).toBe(STREAK.BROKEN);
  });

  it('forgives being late, and pays it to the slot it was late for', () => {
    // Missed Monday, lifted Tuesday: a session done, not a session skipped.
    // A plan that calls that a failure is one people stop following.
    expect(run([TUE], WED).count).toBe(1);
    // The previous Sunday is *late for Friday*, not early for Monday — its
    // window is the one it falls in, so Monday is still outstanding.
    const late = run(['2026-08-02'], TUE);
    expect(late.count).toBe(1);
    expect(late.state).toBe(STREAK.AT_RISK);
    expect(late.nextDue).toBe(MON);
  });

  it('reports what was lost, not just that something was', () => {
    // Mon and Wed hit, Friday's whole window (Fri→Mon) missed. On Saturday it
    // is still open; the following Monday it is not.
    expect(run([MON, WED], SAT).state).toBe(STREAK.AT_RISK);
    const s = run([MON, WED], '2026-08-10');
    expect(s.state).toBe(STREAK.BROKEN);
    expect(s.lost).toBe(2);
    expect(s.count).toBe(0);
  });

  it('has no streak to mourn when there never was one', () => {
    const s = run([], SAT);
    expect(s.state).toBe(STREAK.NONE);
    expect(s.lost).toBe(0);
  });

  it('does not double-count two sessions in one window', () => {
    // Monday and Tuesday both sit in Monday's window. That is one slot hit,
    // however keen you were.
    expect(run([MON, TUE], TUE).count).toBe(1);
  });

  it('never counts extra unscheduled work against you', () => {
    // Tuesday is not on the plan and does not fill a second slot; it also does
    // not cost anything. Two slots hit, one bonus session.
    const s = run([MON, TUE, WED], WED);
    expect(s.count).toBe(2);
    expect(s.state).toBe(STREAK.SAFE);
  });

  it('degenerates to a day-streak when every day is scheduled', () => {
    const every = new Set([0, 1, 2, 3, 4, 5, 6]);
    const s = scheduleStreak({ plan: every, dates: [MON, TUE, WED], today: WED });
    expect(s.count).toBe(3);
    // Every window is one day wide, so Thursday missed is a lapse the moment
    // Friday arrives — exactly the day-streak's behaviour.
    const broken = scheduleStreak({ plan: every, dates: [MON, TUE, WED], today: FRI });
    expect(broken.state).toBe(STREAK.BROKEN);
    expect(broken.lost).toBe(3);
  });

  it('handles a once-a-week plan across a month', () => {
    const sunday = new Set([0]);
    const dates = ['2026-08-09', '2026-08-02', '2026-07-26'];
    expect(scheduleStreak({ plan: sunday, dates, today: '2026-08-09' }).count).toBe(3);
    // Skipped the next Sunday, so by the one after it is broken with 3 lost.
    const after = scheduleStreak({ plan: sunday, dates, today: '2026-08-23' });
    expect(after.state).toBe(STREAK.BROKEN);
    expect(after.lost).toBe(3);
  });

  it('survives junk', () => {
    expect(scheduleStreak({ plan: MWF, dates: null, today: MON }).count).toBe(0);
    expect(scheduleStreak({ plan: [1, 3, 5], dates: [MON], today: MON }).count).toBe(1);
    expect(scheduleStreak({ plan: MWF, dates: [null, undefined, MON], today: MON }).count).toBe(1);
  });
});

describe('bestScheduleRun', () => {
  const best = (dates, today) => bestScheduleRun({ plan: MWF, dates, today });

  it('is zero without a plan or without sessions', () => {
    expect(bestScheduleRun({ plan: new Set(), dates: [MON, WED], today: FRI })).toBe(0);
    expect(bestScheduleRun({})).toBe(0);
    expect(best([], FRI)).toBe(0);
    expect(best(null, FRI)).toBe(0);
  });

  it('counts a perfect Mon/Wed/Fri plan the way the live streak does', () => {
    // The bug this exists for: three sessions a week read as a best of 1,
    // because no two of them were on consecutive calendar days.
    const weeks = ['2026-07-27', '2026-07-29', '2026-07-31', MON, WED, FRI];
    expect(best(weeks, FRI)).toBe(6);
    expect(best(weeks, FRI)).toBe(scheduleStreak({ plan: MWF, dates: weeks, today: FRI }).count);
  });

  it('remembers the longest run after it has ended', () => {
    // Four hit, Friday's window missed (Fri→Sun), then two more.
    const dates = ['2026-07-27', '2026-07-29', '2026-07-31', MON, '2026-08-10', '2026-08-12'];
    // Mon 3 Aug hit, Wed 5 Aug window (Wed→Thu) missed, so the run is 4.
    expect(best(dates, '2026-08-12')).toBe(4);
    expect(scheduleStreak({ plan: MWF, dates, today: '2026-08-12' }).count).toBe(2);
  });

  it('does not let an open, unfilled window break or extend the run', () => {
    // Today is Wednesday and the session is not in yet: still 2, not 0.
    expect(best(['2026-07-31', MON], WED)).toBe(2);
    // On Thursday the window is still open; on Friday it has closed, but a run
    // that ended is still a run that happened.
    expect(best(['2026-07-31', MON], THU)).toBe(2);
    expect(best(['2026-07-31', MON], FRI)).toBe(2);
  });

  it('is never below the live count, whatever the day', () => {
    const dates = ['2026-07-20', '2026-07-22', '2026-07-24', '2026-07-27', '2026-07-29', '2026-07-31', MON, WED];
    for (const today of [WED, THU, FRI, SAT, SUN, '2026-08-10', '2026-08-11']) {
      const live = scheduleStreak({ plan: MWF, dates, today });
      expect(best(dates, today)).toBeGreaterThanOrEqual(live.count);
    }
  });

  it('forgives being late and does not double-count a window', () => {
    // Tuesday is late for Monday; Monday + Tuesday together are one hit.
    expect(best([TUE, WED, FRI], FRI)).toBe(3);
    expect(best([MON, TUE], TUE)).toBe(1);
  });

  it('counts sessions bought back with rest tokens', () => {
    // The caller folds credited days into `dates`, as the live streak does.
    const credited = [WED];
    expect(best([MON, FRI], SAT)).toBe(1);
    expect(best([MON, FRI, ...credited], SAT)).toBe(3);
  });

  it('treats an everyday plan as a day streak', () => {
    const every = new Set([0, 1, 2, 3, 4, 5, 6]);
    expect(bestScheduleRun({ plan: every, dates: [MON, TUE, WED, FRI, SAT], today: SAT })).toBe(3);
  });

  it('copes with a once-a-week plan over months and with junk', () => {
    const sunday = new Set([0]);
    const dates = ['2026-06-07', '2026-06-14', '2026-06-21', '2026-07-05', '2026-07-12'];
    expect(bestScheduleRun({ plan: sunday, dates, today: '2026-07-12' })).toBe(3);
    expect(bestScheduleRun({ plan: [1, 3, 5], dates: [MON, 'nope', null, WED], today: WED })).toBe(2);
  });

  it('crosses a DST change without losing a day', () => {
    // US spring-forward 2026-03-08 (Sunday) and EU 2026-03-29: windows are
    // walked by calendar key, so a 23-hour day is still a day.
    const dates = ['2026-03-06', '2026-03-09', '2026-03-11', '2026-03-27', '2026-03-30', '2026-04-01'];
    expect(bestScheduleRun({ plan: MWF, dates, today: '2026-04-01' })).toBe(3);
  });
});
