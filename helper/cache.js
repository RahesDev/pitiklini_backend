const mongoose = require('mongoose')
const redis = require('redis');
const util = require('util');



const client = redis.createClient();

client.hget = util.promisify(client.hget);
const exec = mongoose.Query.prototype.exec;

mongoose.Query.prototype.cache = function(options={}){
    this.useCache = true;
    this.hashKey = JSON.stringify(options.key || this.mongooseCollection.name);
    return this;
};

mongoose.Query.prototype.exec = async function(){
    if(!this.useCache){
        return await exec.apply(this, arguments);
    }
    const key = JSON.stringify({
        ...this.getFilter()
    });
    const cacheValue = await client.hget(this.hashKey, key);
    if(cacheValue){
        const doc = JSON.parse(cacheValue);
        return Array.isArray(doc)?doc.map(d => new this.model(d)):new this.model(doc);
    }
    const result = await exec.apply(this,arguments);
    client.hset(this.hashKey, key, JSON.stringify(result));
    return result;
};

module.exports ={
    clearKey(hashkey){
        client.del(JSON.stringify(hashkey))
    },
    
    updateCacheValue(model,key,result){
        client.hset(JSON.stringify(model),JSON.stringify(key),JSON.stringify(result));
    },

    deleteCacheValue(model,key){
        client.hdel(JSON.stringify(model),JSON.stringify(key));
    }
    
}