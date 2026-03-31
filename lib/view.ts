declare var eventLoop: typeof import("@next-flip/fz-sdk-mntm/event_loop");
declare var gui: typeof import("@next-flip/fz-sdk-mntm/gui");

let View = {
    _timer: null,
    _back: null,
    _navMap: {},

    init: function() {
        View._back = eventLoop.subscribe(gui.viewDispatcher.navigation, function(sub, item) {
            const currentView = View.current();
            if(currentView) {
                if(View._navMap[currentView].back !== null) {
                    if(View._navMap[currentView].callback !== null) {
                        View._navMap[currentView].callback();
                    }
                    View.show(View._navMap[currentView].back);
                } else {
                    return;
                }
            }
        }, eventLoop);
    },

    addView: function(source: string, back: string, view: Object, callback: Function) {
        View._navMap[source] = {
            source: source,
            back: back,
            view: view,
            backView: null,
            callback: callback,
            connected: callback ? true : false,
            subscription: null,
            subscribed: false,
        }
        return(View._navMap[source].view);
    },

    getView: function(source: string) {
        let view = View.hasView(source);
        return(view);
    },

    hasView: function(source: string) {
        for(let view in View._navMap) {
            if(source === view) {
                return(View._navMap[source].view);
            }
        }
        return(false);
    },

    subscribe: function(source: string, type: string, callback: any) {
        if(View._navMap[source].subscribed) {
            View._navMap[source].subscription.cancel();
            View._navMap[source].subscription = null;
            View._navMap[source].subscribed = false;
        }

        let contract = Utils.getObjectProp(View._navMap[source].view, type)

        if(contract) {
            View._navMap[source].subscription = eventLoop.subscribe(contract, callback);
            View._navMap[source].subscribed = true;
        }
    },

    isSubscribed: function(source: string): boolean {
       return(View._navMap[source].subscribed);
    },

    remove: function(source: string) {
        if(View._navMap[source].subscribed) {
            View._navMap[source].subscription.cancel();
            View._navMap[source].subscription = null;
            View._navMap[source].subscribed = false;
            return(true);
        }
        return(false);
    },

    current: function(): string {
        let current = gui.viewDispatcher.currentView;

        for(let key in View._navMap) {
            if(View._navMap[key].view === current) {
                return key;
            }
        }

        return null;
    },

    show: function(source: string) {
        if(View._navMap[source].view !== null) {
            gui.viewDispatcher.switchTo(View._navMap[source].view);
        }
    },

    timer: function(timeout: number, callback: any) {
        if(View._timer) {
            View._timer.cancel();
            View._timer = null;
        }
        View._timer = eventLoop.subscribe(eventLoop.timer("oneshot", timeout), callback);
    },
};