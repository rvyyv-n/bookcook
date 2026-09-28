// A stand-in for the Web Speech recogniser, for screenshots (shot.mjs "fakeSpeech": true).
// In the page: __say('two onions') hears a phrase, __say('two on', false) a partial, __deny() blocks the mic.
(() => {
  class FakeRecognition {
    start() {
      window.__rec = this;
    }
    stop() {
      this.end();
    }
    abort() {
      this.end();
    }
    end() {
      if (window.__rec === this) window.__rec = undefined;
      setTimeout(() => this.onend?.());
    }
  }
  window.SpeechRecognition = FakeRecognition;
  window.webkitSpeechRecognition = FakeRecognition;
  window.__say = (text, isFinal = true) => {
    const rec = window.__rec;
    if (!rec) return 'not listening';
    rec.onresult?.({ resultIndex: 0, results: { length: 1, 0: { isFinal, length: 1, 0: { transcript: text } } } });
    if (isFinal && !rec.continuous) rec.end();
    return 'ok';
  };
  window.__deny = () => {
    const rec = window.__rec;
    rec?.onerror?.({ error: 'not-allowed' });
    rec?.end();
  };
})();
