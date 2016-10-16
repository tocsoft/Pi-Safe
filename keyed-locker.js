
var ReadWriteLock  = require('rwlock');

var keyedMutexes = {};
var keyedMutexLastUsed = {};
var lock = new ReadWriteLock();

function processKey(lock, callback){
    lock.writeLock(callback);
}

function mutex(key, callback)
{
    lock.readLock(function (release) {
        //key the key specificlock
        var keyedLock = keyedMutexes[key];
        keyedMutexLastUsed[key] = new Date();
        if(!keyedLock){ //lock missing make one
            lock.writeLock(function (release) {
                // do stuff 
                keyedLock = keyedMutexes[key] = new ReadWriteLock();                
                release();
                processKey(keyedLock, callback);
            });
            release();//relewase read lock so write can run
        }else{
            release();//release read
            processKey(keyedLock, callback);
        }
    });
        
}

module.exports = mutex;