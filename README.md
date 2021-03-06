# 《Promise原理》
Promise是js异步编程的一种解决方案，最早由js社区提出和实现，后来ES6将其写进了js语言标准，并提供了原生的Promise类。

## Promise使用
### 1. 声明Promise的js语法

```
var p = new Promise(function (resolve, reject) {
    // ...
    if(/* 异步操作成功 */){
       resolve(result); //result为异步操作成功拿到的结果
    } else {
       reject(reason); //reason为异步操作失败拿到的结果
    }
});

p.then(function (result) {
    // 声明【异步操作成功】的后续操作
    // ...
}, function (reason) {
    // 声明【异步操作失败】的后续操作
    // ...
});
```

需要关注的点：

#### 1.1 传入构造函数的executor函数
在声明一个Promise对象实例时，需要向【Promise构造函数】中传入一个匿名函数来声明异步操作，我们把该函数叫做executor，executor传入构造函数后会立即执行。

executor有`resolve`和`reject`两个入参：

- `resolve`用于【触发】【返回成功结果】之后的操作，`resolve`调用时传入`result`参数
- `reject`用于【触发】【返回失败结果】之后的操作，`reject`调用时传入`reason`参数

#### 1.2 Promise实例的then方法

- 在实例化一个Promise对象之后，我们调用该对象实例的then方法来【声明异步操作成功或失败】后的续操作。

then方法接受两个匿名函数作为入参：

> 第一个匿名函数我们称之为onFulfilled，【声明】返回成功结果之后的操作；onFulfilled接受一个入参result，和resolve的入参result对应
>
> 第二个匿名函数我们称之为onRejected，【声明】返回失败结果之后的操作；onRejected接受一个入参reason，和reject的入参reason对应

- Promise对象的then方法可以被多次调用

代码示例`Promise1.html`：[点击查看源码](./demo/Promise1.html)

#### 1.3 then方法的链式调用

- Promise的then方法支持链式调用：`promise.then(onFulfilled1).then(onFulfilled2)`
- 如果onFulfilled1返回一个普通值x（非Promise），则onFulfilled2的入参则是这个普通值x
- 如果onFulfilled1返回一个Promise，则onFulfilled2的入参则是这个Promise对应的 resolve 的入参

代码示例`Promise2.html`：[点击查看源码](./demo/Promise2.html)

### 2. 用Promise包装ajax

用Promise包装一下ajax实现更优雅的异步调用：

```
let p_ajax = function(url){
        let p = new Promise((resolve,reject)=>{
            ajax({
                url: url,
                success(data){
                    resolve(data);
                },
                fail(reason){
                    reject(reason);
                }
            });
        });

        return p;
    };

p_ajax('http://rap2.taobao.org:38080/app/mock/252985/userInfo').then((val)=>{
        let user = val;
        console.log('用户信息',user);
        let p = p_ajax('http://rap2.taobao.org:38080/app/mock/252985/bill?userId='+user.id);
        return p;
    }).then((val)=>{
        let bill = val;
        console.log('用户账单',bill);
    });

```

代码示例`Promise3.html`：[点击查看源码](./demo/Promise3.html)


## Promise简单实现

### 1. 基础实现

#### 关键点：
1. Promise构造函数接受一个executor函数，executor函数声明**异步操作**并接受resolve和reject两个入参：

> - 在executor中调用resolve来触发**异步操作返回【成功结果】之后的操作**
> - 在executor中调用reject来触发**异步操作返回【失败结果】之后的操作**

2. Promise内部维持三种状态：

> - pending：初始值
> - fulfilled：代表操作成功
> - rejected：代表操作失败
>
3. Promise状态改变的方式有且只有两种：
> - 从pending转变为fulfilled
> - 从pending转变为rejected
>
> 一旦状态发生改变，状态将不能再被改变

4. Promise实例用then来声明**异步操作完成之后**的后续操作

> - 用onFulfilled声明**异步操作返回【成功结果】之后的操作**
> - 用onRejected声明**异步操作返回【失败结果】之后的操作**

5. then方法可以被多次调用，即可以声明多个onFulfilled和onRejected

```
const PENDING = 'PENDING';
const RESOLVED = 'RESOLVED';
const REJECTED = 'REJECTED';

class MyPromise {
    constructor(executor) {
        this.status = PENDING;
        this.result = undefined;
        this.reason = undefined;

        this.onFulfilledCallbacks = [];
        this.onRejectedCallbacks = [];

        const resolve = (result) => {
            // 当异步操作调用resolve时
            // 如果Promise对象的status属性的值是PENDING
            if (this.status === PENDING) {
                // 把Promise对象的status属性的值改为RESOLVED
                this.status = RESOLVED;

                // 把resolve传入的value值赋给Promise对象的result属性值
                this.result = result;

                // 依次调用onFulfilledCallbacks中存放的onFulfilled函数
                // 依次调用的到底是什么函数？
                this.onFulfilledCallbacks.forEach(fn => fn(result));
            }
        }
        const reject = (reason) => {
            // 当异步操作调用reject时
            // 如果Promise对象的status属性的值是PENDING
            if (this.status === PENDING) {
                // 把Promise对象的status属性的值改为REJECTED
                this.status = REJECTED;

                // 把reject传入的reason值赋给Promise对象的reason属性值
                this.reason = reason;

                // 依次调用onRejectedCallbacks中存放的onRejected函数
                this.onRejectedCallbacks.forEach(fn => fn(reason));
            }
        }
        executor(resolve, reject);
    }

    then(onFulfilled, onRejected) {
        if (this.status === RESOLVED) {
            onFulfilled(this.value);
        }

        if (this.status === REJECTED) {
            onRejected(this.reason);
        }

        // 当异步操作未返回时（Promise对象状态为PENDING）
        if (this.status === PENDING) {
            // 把每次调用then方法传入的onFulfilled存放到onFulfilledCallbacks中
            this.onFulfilledCallbacks.push(onFulfilled);
            
            // 把每次调用then方法传入的onRejected存放到onRejectedCallbacks中
            this.onRejectedCallbacks.push(onRejected);
        }
    }
};
```

### 2. 支持链式调用

#### 关键点：

1. then的返回值是**一个新的Promise对象（我们称之为promise2）**，因此then支持链式调用：

```
promise.then(onFulfilled1).then(onFulfilled2);
```

2. 用**promise2（新的Promise对象）**来处理**前一个Promise的then**定义的**onFulfilled1和onRejected1**的返回值

如果onFulfilled1和onRejected1的返回值是普通值（非Promise）：

>- 用**promise2的resolve**直接【传回】该值

如果onFulfilled1和onRejected1的返回值仍然是一个Promise：

> - 用**promise2的resolve**来【传回】**onFulfilled1的入参**
> - 用**promise2的reject**来【传回】**onRejected1的入参**

```
const PENDING = 'PENDING';
const RESOLVED = 'RESOLVED';
const REJECTED = 'REJECTED';
const resolvePromise = (x, resolve, reject) => {
    if (!x) {
        resolve(x);
    } else {
        // 如果x有then方法
        // 说明x是一个Promise
        // 调用一次x的then方法
        let then = x.then;
        if (typeof then === 'function') {
            x.then(y => {
                resolve(y);
            }, r => {
                reject(r);
            })
        } else {
            resolve(x);
        }
    }
}

class MyPromise {
    constructor(executor) {
        this.status = PENDING;
        this.result = undefined;
        this.reason = undefined;

        this.onFulfilledCallbacks = [];
        this.onRejectedCallbacks = [];

        const resolve = (result) => {
            if (this.status === PENDING) {
                this.status = RESOLVED;
                this.result = result;
                this.onFulfilledCallbacks.forEach(fn => fn());
            }
        }
        const reject = (reason) => {
            if (this.status === PENDING) {
                this.status = REJECTED;
                this.reason = reason;
                this.onRejectedCallbacks.forEach(fn => fn());
            }
        }
        executor(resolve, reject);
    }

    then(onFulfilled, onRejected) {

        // 每次调用then方法就会创建一个新的Promise
        let promise2 = new MyPromise((resolve, reject) => {
            if (this.status === RESOLVED) {
                // 拿到onFulfilled的返回值x
                let x = onFulfilled(this.value);

                // 用promise2的resolve/reject处理x
                resolvePromise(x, resolve, reject);
            }

            if (this.status === REJECTED) {
                // 拿到onRejected的返回值x
                let x = onRejected(this.reason);

                // 用promise2的resolve/reject处理x
                resolvePromise(x, resolve, reject);
            }

            if (this.status === PENDING) {
            	// 用匿名函数包裹一下onFulfilled
                // 形成了一个闭包 
                // 就可以通过闭包拿到promise2的resolve和reject方法
                this.onFulfilledCallbacks.push(() => {
                    // 拿到onFulfilled的返回值x
                    let x = onFulfilled(this.result);

                    // 用promise2的resolve/reject处理x
                    resolvePromise(x, resolve, reject);
                });
                this.onRejectedCallbacks.push(() => {
                    // 拿到onRejected的返回值x
                    let x = onRejected(this.reason);

                    // 用promise2的resolve/reject处理x
                    resolvePromise(x, resolve, reject);
                });
            }
        });

        // 返回这个新的Promise
        return promise2;
    }
};
```

代码示例`MyPromise.html`：[点击查看源码](./demo/MyPromise.html)


## Promise其他方法：Promise.race、Promise.all等

```
// 请求3个接口，只要有一个接口返回数据，就进行下一步操作
Promise.race([
    p_ajax('http://rap2.taobao.org:38080/app/mock/252985/mobilephone'),
    p_ajax('http://rap2.taobao.org:38080/app/mock/252985/computer'),
    p_ajax('http://rap2.taobao.org:38080/app/mock/252985/TV')
]).then((data)=>{
    let product = data;
    console.log('Promise.race',data);
});

// 请求3个接口，等3个接口的数据都返回后，再做下一步操作
Promise.all([
    p_ajax('http://rap2.taobao.org:38080/app/mock/252985/mobilephone'),
    p_ajax('http://rap2.taobao.org:38080/app/mock/252985/computer'),
    p_ajax('http://rap2.taobao.org:38080/app/mock/252985/TV')
]).then(data=>{
    let products = data;
    console.log('Promise.all',products);
});

```

代码示例`Promise4.html`：[点击查看源码](./demo/Promise4.html)

## 辅助资料

- 课程中需要用到的数据接口：

```
// 用户信息
http://rap2.taobao.org:38080/app/mock/252985/userInfo

// 用户账单
http://rap2.taobao.org:38080/app/mock/252985/bill?userId=1

// 手机
http://rap2.taobao.org:38080/app/mock/252985/mobilephone

// 电脑
http://rap2.taobao.org:38080/app/mock/252985/computer

// 电视机
http://rap2.taobao.org:38080/app/mock/252985/TV

```

- 封装一个简单的ajax方法

```
/**
 * ajax方法接受一个obj对象
 * obj = {
 *  url:'', //请求接口地址
 *  success(data){}, //成功回掉
 *  fail(err){} //失败回掉
 * } 
 */
function ajax(obj) {
    let xhr = new XMLHttpRequest();
    xhr.open('get', obj.url, true);
    xhr.send();
    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4 && xhr.status === 200) {
            let data = (JSON.parse(xhr.responseText));
            if(data.isOk === false){
                obj.fail ? obj.fail(data): null;
            }else{
                obj.success(data);
            }
        }
    }
}
```
