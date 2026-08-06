import { describe, it, expect } from 'vitest';
import { planDays, scheduleStreak } from './scheduleStreak.js';
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
