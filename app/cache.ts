interface cacheOptions{
    ttl: number;
    evictionDuration: number;
}

export class MyCache {
    private TTL:number = 1000000; //seconds
    private cacheObj: Map<string|number, any>
    constructor(CacheOptions: cacheOptions|null = null) {
        // this.TTL = CacheOptions.ttl;
        this.cacheObj = new Map<string|number, any>()

        // setInterval(()=>{
        //     Object.entries(this.cacheObj).forEach(([key, value])=>{
        //         if(value.expiry < Date.now()) {
        //             this.cacheObj.delete(key);
        //         }
        //     })
        // }, CacheOptions.evictionDuration * 1000)
    }

    set(key:string|number, value:any, expiry: number=-1): void {
        this.cacheObj.set(key, {
            value: value,
            expiry: Date.now() + this.TTL * 1000
        })

        if(expiry==-1) {
            setTimeout(()=>{
                this.cacheObj.delete(key);
            }, expiry)
        }
    }

    get(key: string|number): any {
        if(this.cacheObj.has(key)) {
            return this.cacheObj.get(key).value;
        }else {
            return undefined;
        }
    }

    
}
