/**
 * AudioManager - BGMと効果音を管理
 */
export class AudioManager {
    constructor() {
        this.audioContext = null;
        this.currentBGM = null;
        this.currentGainNode = null;
        this.isPlaying = false;
    }

    /**
     * AudioContextを初期化（ユーザーインタラクション後に呼ぶ）
     */
    init() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    /**
     * BGMを停止
     */
    stopBGM() {
        if (this.currentBGM) {
            this.currentBGM.forEach(osc => {
                try {
                    osc.stop();
                } catch (e) {
                    // 既に停止している場合は無視
                }
            });
            this.currentBGM = null;
        }
        if (this.currentGainNode) {
            this.currentGainNode.disconnect();
            this.currentGainNode = null;
        }
        this.isPlaying = false;
    }

    /**
     * DEMO MODE用のBGM（明るく元気なメロディー）
     */
    playDemoBGM() {
        this.init();
        this.stopBGM();

        const melody = [
            { note: 'E5', duration: 0.15 },
            { note: 'E5', duration: 0.15 },
            { note: 'rest', duration: 0.15 },
            { note: 'E5', duration: 0.15 },
            { note: 'rest', duration: 0.15 },
            { note: 'C5', duration: 0.15 },
            { note: 'E5', duration: 0.15 },
            { note: 'rest', duration: 0.15 },
            { note: 'G5', duration: 0.15 },
            { note: 'rest', duration: 0.45 },
            { note: 'G4', duration: 0.15 },
            { note: 'rest', duration: 0.45 }
        ];

        this.playMelody(melody, true);
        this.isPlaying = true;
    }

    /**
     * OPENAI MODE用のBGM（少しミステリアスで知的なメロディー）
     */
    playAIModeBGM() {
        this.init();
        this.stopBGM();

        const melody = [
            { note: 'C5', duration: 0.2 },
            { note: 'E5', duration: 0.2 },
            { note: 'G5', duration: 0.2 },
            { note: 'B5', duration: 0.2 },
            { note: 'A5', duration: 0.2 },
            { note: 'G5', duration: 0.2 },
            { note: 'E5', duration: 0.2 },
            { note: 'C5', duration: 0.2 },
            { note: 'D5', duration: 0.2 },
            { note: 'F5', duration: 0.2 },
            { note: 'A5', duration: 0.2 },
            { note: 'G5', duration: 0.4 }
        ];

        this.playMelody(melody, true);
        this.isPlaying = true;
    }

    /**
     * メロディーを再生
     */
    playMelody(melody, loop = false) {
        const startTime = this.audioContext.currentTime;
        let currentTime = startTime;

        const playSequence = () => {
            this.currentBGM = [];

            melody.forEach((note, index) => {
                if (note.note === 'rest') {
                    currentTime += note.duration;
                    return;
                }

                const freq = this.getNoteFrequency(note.note);
                const osc = this.audioContext.createOscillator();
                const gainNode = this.audioContext.createGain();

                osc.type = 'square'; // チップチューン風の矩形波
                osc.frequency.setValueAtTime(freq, currentTime);

                // エンベロープ（音量の変化）
                gainNode.gain.setValueAtTime(0, currentTime);
                gainNode.gain.linearRampToValueAtTime(0.15, currentTime + 0.01);
                gainNode.gain.linearRampToValueAtTime(0.1, currentTime + note.duration * 0.8);
                gainNode.gain.linearRampToValueAtTime(0, currentTime + note.duration);

                osc.connect(gainNode);
                gainNode.connect(this.audioContext.destination);

                osc.start(currentTime);
                osc.stop(currentTime + note.duration);

                this.currentBGM.push(osc);
                currentTime += note.duration;
            });

            // ループ再生
            if (loop) {
                const totalDuration = currentTime - startTime;
                setTimeout(() => {
                    if (this.isPlaying) {
                        playSequence();
                    }
                }, totalDuration * 1000);
            }
        };

        playSequence();
    }

    /**
     * TIME UP効果音
     */
    playTimeUpSound() {
        this.init();

        const now = this.audioContext.currentTime;

        // 下降音（ゲームオーバー風）
        for (let i = 0; i < 8; i++) {
            const osc = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(440 - i * 50, now + i * 0.08);

            gainNode.gain.setValueAtTime(0, now + i * 0.08);
            gainNode.gain.linearRampToValueAtTime(0.2, now + i * 0.08 + 0.01);
            gainNode.gain.linearRampToValueAtTime(0, now + i * 0.08 + 0.08);

            osc.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            osc.start(now + i * 0.08);
            osc.stop(now + i * 0.08 + 0.08);
        }
    }

    /**
     * クリア効果音
     */
    playClearSound() {
        this.init();

        const now = this.audioContext.currentTime;

        // 上昇音（勝利のファンファーレ風）
        const notes = ['C5', 'E5', 'G5', 'C6'];
        notes.forEach((note, i) => {
            const osc = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            osc.type = 'square';
            osc.frequency.setValueAtTime(this.getNoteFrequency(note), now + i * 0.15);

            gainNode.gain.setValueAtTime(0, now + i * 0.15);
            gainNode.gain.linearRampToValueAtTime(0.2, now + i * 0.15 + 0.01);
            gainNode.gain.linearRampToValueAtTime(0, now + i * 0.15 + 0.15);

            osc.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            osc.start(now + i * 0.15);
            osc.stop(now + i * 0.15 + 0.15);
        });
    }

    /**
     * ジャンプ効果音
     */
    playJumpSound() {
        this.init();

        const now = this.audioContext.currentTime;
        const osc = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(200, now + 0.1);

        gainNode.gain.setValueAtTime(0.1, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

        osc.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        osc.start(now);
        osc.stop(now + 0.1);
    }

    /**
     * 音符名から周波数を取得
     */
    getNoteFrequency(note) {
        const notes = {
            'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23,
            'G4': 392.00, 'A4': 440.00, 'B4': 493.88,
            'C5': 523.25, 'D5': 587.33, 'E5': 659.25, 'F5': 698.46,
            'G5': 783.99, 'A5': 880.00, 'B5': 987.77,
            'C6': 1046.50, 'D6': 1174.66, 'E6': 1318.51
        };
        return notes[note] || 440;
    }
}
