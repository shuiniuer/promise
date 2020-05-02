const PENDING = 'PENDING';
const RESOLVED = 'RESOLVED';
const REJECTED = 'REJECTED';

const resolvePromise = (promise2,x,resolve,reject)=>{

}

class Promise {
    constructor(executor){
        this.status = PENDING;
        this.value = undefined;
        this.reason = undefined;

        this.onFulfilledCallbacks = [];
        this.onRejectedCallbacks = [];

        const resolve = (val) => {
            console.log('resolve');
            if(this.status === PENDING){
                this.status = RESOLVED;
                this.value = val;
                this.onFulfilledCallbacks.forEach(fn=>fn());
            }
        }
        const reject = (reason) => {
            console.log('reject');
            if(this.status === PENDING){
                this.status = REJECTED;
                this.reason = reason;
                this.onRejectedCallbacks.forEach(fn=>fn());
            }
        }
        try {
            executor(resolve,reject);
        }
        catch(e){
            reject(e);
        }
        
    }

    then(onFulfilled,onRejected){

        let promise2 = new Promise((resolve,reject)=>{
            if(this.status === RESOLVED){
                setTimeout(()=>{
                    try{
                        let x = onFulfilled(this.value);
                        resolvePromise(promise2,x,resolve,reject);
                    }catch(e){
                        reject(e);
                    }
                },0);
            }
            if(this.status === REJECTED){
                setTimeout(()=>{
                    try{
                        let x = onRejected(this.reason);
                        resolvePromise(promise2,x,resolve,reject);
                    }catch(e){
                        reject(e);
                    }
                },0);
            }
            if(this.status === PENDING){
                this.onFulfilledCallbacks.push(()=>{
                    setTimeout(()=>{
                        try{
                            let x = onFulfilled(this.value);
                            resolvePromise(promise2,x,resolve,reject);
                        }catch(e){
                            reject(e);
                        }
                    },0);
                });
                this.onRejectedCallbacks.push(()=>{
                    try{
                        setTimeout(()=>{
                            let x = onRejected(this.reason);
                            resolvePromise(promise2,x,resolve,reject);
                        },0);
                    }catch(e){
                        reject(e);
                    }
                });
            }
        });

        return promise2;
    }

}

module.exports = Promise;