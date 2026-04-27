// Imports the microphone icons used to visually show whether TTS is on or off.
import micOnIcon from '../assets/mic_on.png';
import micOffIcon from '../assets/mic_off.png';

// Renders a reusable button that toggles text-to-speech on or off.
export default function TtsToggle({ enabled, onToggle, labels }) {
  // Sets the accessible button label based on whether TTS is currently enabled.
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
      {/* The icon changes depending on the current TTS state. */}
      <img
        src={enabled ? micOnIcon : micOffIcon}
        alt=""
        className="tts-toggle__icon"
        aria-hidden="true"
      />

      {/* Shows a short visible label for the current TTS state. */}
      <span className="tts-toggle__text">
        {enabled ? labels?.ttsOn || 'TTS On' : labels?.ttsOff || 'TTS Off'}
      </span>
    </button>
  );
}