declare var serial: typeof import("@next-flip/fz-sdk-mntm/serial");

let Serial = {
    serial_is_open: false,

    open: function() {
        if(!Serial.serial_is_open) {
            serial.setup("usart", 115200);
            Serial.serial_is_open = true;
        }
    },

    read: function() {
        let c = serial.readAny();
        let data = c;

        while(c && c.length > 0) {
            c = serial.readAny();
            if(c) {
                data = data + c;
            }
        }

        return(data);
    },

    expect: function(pattern: string) : string {
        let data: string;
        if(serial.expect(pattern) === 0) {
            data = Serial.read();
        }
        return(data);
    },

    write: function(str: string) {
        if(!Serial.isOpen()) {
            Serial.open();
        }
        serial.write(str + "\n");
    },

    close: function() {
        if(Serial.serial_is_open) {
            serial.end();
            Serial.serial_is_open = false;
        }
    },

    isOpen: function() {
        return(Serial.serial_is_open);
    }
};