import micOnIcon from '../assets/mic_on.png';
import micOffIcon from '../assets/mic_off.png';

export default function TtsToggle({ enabled, onToggle, labels }) {
  const buttonLabel = enabled
    ? labels?.ttsDisable || 'Turn text-to-speech off'
    : labels?.ttsEnable || 'Turn text-to-speech on';

  return (
    <button
      type="button"
      className={`tts-toggle ${enabled ? 'tts-toggle--enabled' : ''}`}
      aria-pressed={enabled}
      aria-label={buttonLabel}
      title={buttonLabel}
      onClick={onToggle}
    >
      <img
        src={enabled ? micOnIcon : micOffIcon}
        alt=""
        className="tts-toggle__icon"
        aria-hidden="true"
      />
      <span className="tts-toggle__text">
        {enabled ? labels?.ttsOn || 'TTS On' : labels?.ttsOff || 'TTS Off'}
      </span>
    </button>
  );
}