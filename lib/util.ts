let Utils = {
    trim: function(str: string) {
        let start: number = 0;
        let end: number = str.length - 1;

        while(start <= end) {
            let c: string = str.slice(start, start + 1);
            if(c === ' ' || c === '\r' || c === '\n' || c === '\t') {
                start++;
            } else {
                break;
            }
        }

        while(end >= start) {
            let c:string = str.slice(end, end + 1);
            if(c === ' ' || c === '\r' || c === '\n' || c === '\t') {
                end--;
            } else {
                break;
            }
        }

        return str.slice(start, end + 1);
    },

    splitByNewLine: function(str: string): string[] {
        const lines: string[] = [];
        let start = 0;
        
        let nextNewline = str.indexOf('\r\n');
        
        while (nextNewline !== -1) {
            lines.push(str.slice(start, nextNewline));
            start = nextNewline + 2;
            nextNewline = str.indexOf('\r\n', start);
        }
        
        lines.push(str.slice(start));
        return lines;
    },

    removeListDups: function(list: string[]) {
        let found: boolean = false;
        let out: string[] = [];

        for(let i = 0; i < list.length; i++) {
            let tmp: string = list[i];
            found = false;

            for(let t = 0; t < out.length; t++) {
                if(tmp === out[t]) {
                    found = true;
                    break;
                }
            }

            if(!found) {
                out.push(tmp);
            }
        }

        return(out);
    },

    getObjectProp: function(obj: any, key: string): any {
        for(let k in obj) {
            if(k === key) {
                return obj[k];
            }
        }
        return null;
    },
};