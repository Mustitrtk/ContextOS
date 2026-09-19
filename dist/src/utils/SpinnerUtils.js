"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpinnerUtils = void 0;
const chalk_1 = __importDefault(require("chalk"));
class SpinnerUtils {
    /**
     * Starts a live spinner in TTY environments, or prints a static log in non-TTY/test.
     */
    static start(message) {
        this.stop();
        this.currentMessage = message;
        if (!process.stdout.isTTY || process.env.NODE_ENV === 'test') {
            console.log(chalk_1.default.gray(` - ${message}`));
            return;
        }
        this.frameIndex = 0;
        process.stdout.write(`${chalk_1.default.cyan(this.frames[0])} ${message}`);
        this.interval = setInterval(() => {
            this.frameIndex = (this.frameIndex + 1) % this.frames.length;
            process.stdout.write(`\r${chalk_1.default.cyan(this.frames[this.frameIndex])} ${this.currentMessage}`);
        }, 80);
    }
    /**
     * Updates the message of an active spinner.
     */
    static setMessage(message) {
        this.currentMessage = message;
        if (process.stdout.isTTY && process.env.NODE_ENV !== 'test' && this.interval) {
            process.stdout.write(`\r${chalk_1.default.cyan(this.frames[this.frameIndex])} ${this.currentMessage}`);
        }
    }
    /**
     * Stops the spinner with a green success message.
     */
    static succeed(message) {
        const msg = message || this.currentMessage;
        this.stop();
        console.log(`${chalk_1.default.green('✓')} ${msg}`);
    }
    /**
     * Stops the spinner with a red failure message.
     */
    static fail(message) {
        const msg = message || this.currentMessage;
        this.stop();
        console.log(`${chalk_1.default.red('✗')} ${msg}`);
    }
    /**
     * Stops the spinner cleanly.
     */
    static stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
            if (process.stdout.isTTY && process.env.NODE_ENV !== 'test') {
                process.stdout.write('\r\x1b[K'); // Clear current line
            }
        }
    }
}
exports.SpinnerUtils = SpinnerUtils;
SpinnerUtils.frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
SpinnerUtils.interval = null;
SpinnerUtils.frameIndex = 0;
SpinnerUtils.currentMessage = '';
