import { useState } from 'react';
import { Check, Shield } from 'lucide-react';
import Modal from '../ui/Modal.jsx';
import Particles from '../fx/Particles.jsx';
import CountUp from '../fx/CountUp.jsx';
import Seal from '../ink/Seal.jsx';
import { useHaptics } from '../../hooks/useHaptics.js';
import { useIronBalance } from '../../hooks/useIronBalance.js';
import { useRestTokens } from '../../hooks/useRestTokens.js';
import { playChime } from '../../utils/sound.js';
import { flairSeal } from '../../utils/flairSeal.js';
import { UI_KANJI } from '../../utils/kanji.js';
import useSettingsStore from '../../store/settingsStore.js';
import {
  COSMETICS, canAfford, rollChest, CHEST_PRICE,
  TOKEN_IRON_PRICE, IRON_PER_SESSION, IRON_PER_PR, IRON_PER_QUEST,
} from '../../utils/economy.js';
import '../../styles/ink-you.css';

const RARITY_COLOR = {
  common: 'var(--mute-2)',
  rare: 'var(--moss)',
  epic: 'var(--ver-soft)',
  legendary: 'var(--gold-leaf)',
};
const TYPE_LABEL = { titleFlair: 'Title seal' };
const TYPES = ['titleFlair'];

function Coin({ size = 12 }) {
  return <span className="yv-coin" style={{ width: size, height: size }} />;
}

export default function VaultModal({ isOpen, onClose }) {
  const { balance, loaded } = useIronBalance();
  const tokens = useRestTokens();
  const owned = useSettingsStore((s) => s.ownedCosmetics);
  const equipped = useSettingsStore((s) => s.equipped);
  const buyCosmetic = useSettingsStore((s) => s.buyCosmetic);
  const equipCosmetic = useSettingsStore((s) => s.equipCosmetic);
  const openChest = useSettingsStore((s) => s.openChest);
  const buyToken = useSettingsStore((s) => s.buyToken);
  const haptic = useHaptics();

  const [burst, setBurst] = useState(null);
  const [chestResult, setChestResult] = useState(null);

  // A chest can only drop something you do not own. With the whole catalogue
  // owned it used to take 200 Iron and hand back "nothing new dropped".
  const ownsEverything = COSMETICS.every((c) => owned.includes(c.id));
  const chestOpen = loaded && !ownsEverything && balance >= CHEST_PRICE;
  const tokenOpen = loaded && balance >= TOKEN_IRON_PRICE;

  function purchaseToken() {
    if (!tokenOpen) return;
    buyToken(TOKEN_IRON_PRICE);
    haptic('pr'); playChime('quest'); setBurst(Date.now()); setTimeout(() => setBurst(null), 1200);
  }

  function buy(c) {
    if (!loaded || !canAfford(balance, c.price) || owned.includes(c.id)) return;
    buyCosmetic(c.id, c.price);
    haptic('pr'); playChime('quest'); setBurst(Date.now()); setTimeout(() => setBurst(null), 1200);
  }
  function equip(c) {
    equipCosmetic(c.type, c.id); haptic('tap'); playChime('tick');
  }
  function chest() {
    if (!chestOpen) return;
    const rolled = rollChest(Date.now(), owned);
    if (!rolled) return;
    openChest(CHEST_PRICE, rolled.id);
    setChestResult({ ...rolled, key: Date.now() });
    haptic('pr'); playChime('achievement'); setBurst(Date.now()); setTimeout(() => setBurst(null), 1400);
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="The Vault">
      {burst && <Particles key={burst} count={24} />}

      <div className="yv-balance">
        <span className="yv-balance__k">Balance</span>
        <span className="yv-balance__v">
          <Coin size={14} /><CountUp value={balance} format={(n) => Math.round(n).toLocaleString()} /> Iron
        </span>
      </div>

      {/* Chest */}
      <button type="button" onClick={chest} disabled={!chestOpen} className="yv-offer">
        <span className="yv-offer__l">
          <Seal kanji={UI_KANJI.vault} size={34} rotate={-3} className="you-seal--gold" />
          <span>
            <span className="yv-offer__t">Open a Loot Chest</span>
            <span className="yv-offer__s">
              {ownsEverything ? 'You own every cosmetic — nothing left to drop' : 'A random cosmetic — rarer is luckier'}
            </span>
          </span>
        </span>
        <span className="yv-price"><Coin />{CHEST_PRICE}</span>
      </button>
      {chestResult && (
        <p key={chestResult.key} className="yv-won">
          {chestResult.name} ({chestResult.rarity}) added to your collection!
        </p>
      )}

      {/* Rest-token exchange: spend Iron on a streak shield. */}
      <div className="yv-offer">
        <span className="yv-offer__l">
          <Shield size={22} strokeWidth={1.6} aria-hidden style={{ color: 'var(--gold-leaf)', flex: 'none' }} />
          <span>
            <span className="yv-offer__t">Buy a Rest Token</span>
            <span className="yv-offer__s">Protects your streak on a missed day · you have {tokens}</span>
          </span>
        </span>
        <button
          type="button"
          onClick={purchaseToken}
          disabled={!tokenOpen}
          aria-label={`Buy a rest token for ${TOKEN_IRON_PRICE} Iron`}
          className="yv-buy yv-price"
        >
          <Coin size={10} />{TOKEN_IRON_PRICE}
        </button>
      </div>

      {/* Cosmetics by type */}
      {TYPES.map((type) => (
        <div key={type}>
          <p className="yv-h">{TYPE_LABEL[type]}</p>
          <div className="yv-grid">
            {COSMETICS.filter((c) => c.type === type).map((c) => {
              const isOwned = owned.includes(c.id);
              const isEquipped = equipped?.[type] === c.id;
              const affordable = loaded && canAfford(balance, c.price);
              return (
                <div key={c.id} className={`yv-card ${isEquipped ? 'yv-card--on' : ''}`}>
                  <div className="yv-card__top">
                    <Seal kanji={flairSeal(c.id)} size={34} rotate={c.price % 2 ? -4 : 4} />
                    <span>
                      <span className="yv-card__name">{c.name}</span>
                      <span className="yv-card__rar" style={{ color: RARITY_COLOR[c.rarity] }}>{c.rarity}</span>
                    </span>
                  </div>
                  {isOwned ? (
                    <button type="button" onClick={() => equip(c)} className={`yv-act ${isEquipped ? 'yv-act--on' : ''}`}>
                      {isEquipped && <Check size={13} strokeWidth={3} />}{isEquipped ? 'Equipped' : 'Equip'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => buy(c)}
                      disabled={!affordable}
                      aria-label={`Buy ${c.name} for ${c.price} Iron`}
                      className="yv-act yv-price"
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
      <p className="yv-foot">
        Iron is earned as you train: <span>+{IRON_PER_SESSION} per workout · +{IRON_PER_PR} per PR · +{IRON_PER_QUEST} per quest</span>, plus your Daily Dungeon bonus.
      </p>
    </Modal>
  );
}
