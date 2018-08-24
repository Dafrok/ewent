/**
 * @file Ewent
 * @author o.o@mug.dog
 */

const register = Symbol('register');
const unregister = Symbol('unregister');
const instanceMap = Symbol('instanceMap');

export default class Ewent {

    constructor(
        $target,
        options = {
            id: 'default',
            channel: 'default',
            origin: global.location.origin
        }
    ) {
        if (!$target) {
            throw Error('Target window is not exists.');
        }
        else if ($target.postMessage !== 'function') {
            throw Error('`window.postMessage` API is not supported.');
        }
        this.id = options.id;
        this.channel = options.channel;
        this.origin = options.origin;
        this.window = $target;
        this.callbacks = {};
        this.register();
    }

    on(type, fn, feedback) {
        const {callbacks, origin, channel} = this;
        const callback = e => {
            if (e.origin !== origin || e.data.channel !== channel || type !== e.data.type) {
                return;
            }
            const result = fn(e.data.data);
            if (feedback) {
                this.fire(type, result);
            }
        };
        callback.fn = fn;

        callbacks[type] = callbacks[type] || [];
        const isExist = callbacks[type].reduce(function (isExist, callback) {
            return callback.fn === fn || isExist;
        }, false);

        if (!isExist) {
            callbacks[type].push(callback);
            global.addEventListener('message', callback);
        }
        return this;
    }

    off(type, fn) {
        const callbacks = this.callbacks[type] || [];
        callbacks.forEach(function (callback, index) {
            if (callback.fn === fn) {
                callbacks.splice(index, 1);
                global.removeEventListener('message', callback);
            }
        });
        return this;
    }

    dispose() {
        const {callbacks} = this;
        Object.entries(callbacks).forEach(([type, callbackStack]) => {
            callbackStack.forEach(function (callback) {
                global.removeEventListener('message', callback);
            });
        });
        this.unregister();
    }

    fire(type, msg) {
        this.window.postMessage({
            channel: this.channel,
            type: type,
            data: msg
        }, this.origin);
        return this;
    }

    [register]() {
        Ewent[register](this.id, this);
    }

    [unregister]() {
        Ewent[unregister](this.id);
    }

}

Ewent[instanceMap] = {};

Ewent[register] = function (id, Ewent) {
    const instance = Ewent[instanceMap][id];
    if (instance && Ewent !== instance) {
        throw Error(`Target Ewent instance "${id}" is already exists.`
            + 'Please change the id in options of constructor if nessecery.');
    }
    Ewent[instanceMap][id] = Ewent;
};

Ewent[unregister] = function (id = 'default') {
    delete Ewent[instanceMap][id];
};

Ewent.getInstance = function (id = 'default') {
    return Ewent[instanceMap][id];
};
