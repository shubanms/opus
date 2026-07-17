import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Check } from 'lucide-react';
import Modal from '../ui/Modal.jsx';
import Particles from '../fx/Particles.jsx';
import CountUp from '../fx/CountUp.jsx';
import { db } from '../../db/db.js';
import { useLifetimeStats } from '../../hooks/useProgress.js';
import { useHaptics } from '../../hooks/useHaptics.js';
import { playChime } from '../../utils/sound.js';
import useSettingsStore from '../../store/settingsStore.js';
import {
  COSMETICS, cosmeticById, earnedIron, ironBalance, canAfford, rollChest, CHEST_PRICE,
} from '../../utils/economy.js';

const RARITY_COLOR = {
  common: 'var(--color-ash)',
  rare: '#6ea3c9',
  epic: '#b877dd',
  legendary: 'var(--color-gold)',
};
const TYPE_LABEL = { titleFlair: 'Title flair', cardTheme: 'Card theme', logoSkin: 'Logo skin' };
const TYPES = ['titleFlair', 'cardTheme', 'logoSkin'];

function Coin({ size = 12 }) {
  return <span style={{ display: 'inline-block', width: size, height: size, transform: 'rotate(45deg)', background: 'linear-gradient(135deg, var(--color-gold), #a8791f)', borderRadius: 2 }} />;
}

export default function VaultModal({ isOpen, onClose }) {
  const life = useLifetimeStats();
  const questClaims = useLiveQuery(() => db.questClaims.count(), []) ?? 0;
  const ironSpent = useSettingsStore((s) => s.ironSpent);
  const dungeonIron = useSettingsStore((s) => s.dungeonIron);
  const owned = useSettingsStore((s) => s.ownedCosmetics);
  const equipped = useSettingsStore((s) => s.equipped);
  const buyCosmetic = useSettingsStore((s) => s.buyCosmetic);
  const equipCosmetic = useSettingsStore((s) => s.equipCosmetic);
  const openChest = useSettingsStore((s) => s.openChest);
  const haptic = useHaptics();

  const balance = ironBalance(earnedIron({ workouts: life.workouts, prCount: life.prCount, questClaims, bonusIron: dungeonIron }), ironSpent);
  const [burst, setBurst] = useState(null);
  const [chestResult, setChestResult] = useState(null);

  function buy(c) {
    if (!canAfford(balance, c.price) || owned.includes(c.id)) return;
    buyCosmetic(c.id, c.price);
    haptic('pr'); playChime('quest'); setBurst(Date.now()); setTimeout(() => setBurst(null), 1200);
  }
  function equip(c) {
    equipCosmetic(c.type, c.id); haptic('tap'); playChime('tick');
  }
  function chest() {
    if (balance < CHEST_PRICE) return;
    const rolled = rollChest(Date.now(), owned);
    openChest(CHEST_PRICE, rolled?.id ?? null);
    setChestResult(rolled ? { ...rolled, key: Date.now() } : { none: true, key: Date.now() });
    haptic('pr'); playChime('achievement'); setBurst(Date.now()); setTimeout(() => setBurst(null), 1400);
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="The Vault">
      {burst && <Particles key={burst} count={24} />}

      <div className="mb-4 flex items-center justify-between rounded-2xl px-4 py-3" style={{ background: 'var(--color-obsidian)' }}>
        <span className="font-sans text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--color-ash)' }}>Balance</span>
        <span className="flex items-center gap-2 font-mono text-lg font-bold" style={{ color: 'var(--color-gold)' }}>
          <Coin size={14} /><CountUp value={balance} format={(n) => Math.round(n).toLocaleString()} /> Iron
        </span>
      </div>

      {/* Chest */}
      <button
        onClick={chest}
        disabled={balance < CHEST_PRICE}
        className="mb-4 flex w-full items-center justify-between rounded-2xl px-4 py-3"
        style={{ background: 'var(--color-ivory)', opacity: balance < CHEST_PRICE ? 0.5 : 1, border: '1px solid var(--color-gold)' }}
      >
        <span className="flex items-center gap-2">
          <span style={{ fontSize: 20 }}>🎁</span>
          <span className="text-left">
            <span className="block font-sans text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Open a Loot Chest</span>
            <span className="block font-sans text-xs" style={{ color: 'var(--color-text-secondary)' }}>A random cosmetic — rarer is luckier</span>
          </span>
        </span>
        <span className="flex items-center gap-1 font-mono text-sm font-bold" style={{ color: 'var(--color-gold)' }}><Coin />{CHEST_PRICE}</span>
      </button>
      {chestResult && (
        <p key={chestResult.key} className="mb-4 text-center font-sans text-sm" style={{ color: 'var(--color-gold)' }}>
          {chestResult.none ? 'You already own everything — nothing new dropped.' : `✦ ${chestResult.name} (${chestResult.rarity}) added to your collection!`}
        </p>
      )}

      {/* Cosmetics by type */}
      {TYPES.map((type) => (
        <div key={type} className="mb-4">
          <p className="mb-2 font-sans text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-ash)' }}>{TYPE_LABEL[type]}</p>
          <div className="grid grid-cols-2 gap-2">
            {COSMETICS.filter((c) => c.type === type).map((c) => {
              const isOwned = owned.includes(c.id);
              const isEquipped = equipped?.[type] === c.id;
              const affordable = canAfford(balance, c.price);
              return (
                <div key={c.id} className="rounded-xl p-3" style={{ background: 'var(--color-ivory)', border: `1px solid ${isEquipped ? 'var(--color-gold)' : 'transparent'}` }}>
                  <div className="flex items-center justify-between">
                    <span className="font-sans text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                      {c.type === 'titleFlair' ? `${c.value} ` : ''}{c.name}
                    </span>
                    <span className="font-mono text-[10px] uppercase" style={{ color: RARITY_COLOR[c.rarity] }}>{c.rarity}</span>
                  </div>
                  {isOwned ? (
                    <button
                      onClick={() => equip(c)}
                      className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg py-1.5 font-sans text-xs font-semibold"
                      style={{ background: isEquipped ? 'var(--color-gold)' : 'var(--color-chalk)', color: isEquipped ? 'var(--color-obsidian)' : 'var(--color-text-primary)' }}
                    >
                      {isEquipped && <Check size={12} strokeWidth={3} />}{isEquipped ? 'Equipped' : 'Equip'}
                    </button>
                  ) : (
                    <button
                      onClick={() => buy(c)}
                      disabled={!affordable}
                      className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg py-1.5 font-mono text-xs font-bold"
                      style={{ background: affordable ? 'var(--color-gold)' : 'var(--color-chalk)', color: affordable ? 'var(--color-obsidian)' : 'var(--color-ash)' }}
                    >
                      <Coin size={10} />{c.price}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
      <p className="text-center font-sans text-xs" style={{ color: 'var(--color-ash)' }}>
        Iron is earned as you train — every session, PR and quest adds to your balance.
      </p>
    </Modal>
  );
}
