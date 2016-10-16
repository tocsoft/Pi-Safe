var dns = require('native-dns'),
  macfromip = require('macfromip'),
  Cache = require('mem-cache'),
  cache = new Cache(),
  lock = require("./keyed-locker.js"),
  server = dns.createServer();


function getMac(ipAddress, callback){
    var key = "mac::" + ipAddress;
    var mac = cache.get(key);
    if(!mac){
        if(macfromip.ipIsSelf(ipAddress)){
            
            cache.set(key, "LOCALHOST");
            callback(null, "LOCALHOST");
        }else{
            //mac not set lets retrive it and cache it for later
            macfromip.getMac(ipAddress, function(err, data){
                if(err){
                    callback(err);
                }

                cache.set(key, data);
                callback(null, data);
            });
        }
    }else{
        callback(null, mac);
    }  
}

function populateResponse(response, answer){
    answer.answer.forEach(function (a) {
        response.answer.push(a);
    });
    answer.authority.forEach(function (a) {
        response.authority.push(a);
    });
}

function runRealDnsRquest(request, response){
    
    var key = "DNS::" + request.question[0].name + " - " + request.question[0].type;
    lock(key, function(next){
        var answer = cache.get(key);
        //lets add caching
        if(answer){
            
            console.log("[HIT  ] dns lookup: " + key);
           
            populateResponse(response, answer);

            response.send();
            next();
        }else{
            console.log("[MISS ] dns lookup: " + key);
            var req = dns.Request({
                question: request.question[0],
                server: { address: '8.8.8.8', port: 53, type: 'udp' },
                timeout: 5000,
            });
            
            req.on('timeout', function () {
                console.log('Timeout in making request');

            });
            
            req.on('error', function () {
                console.log(arguments);

            });
            
            
            req.on('message', function (err, answer) {
                
                populateResponse(response, answer);
                if(response.answer.length > 0){
                    cache.set(key,  answer, response.answer[0].ttl * 1000);//seconds to miliseconds
                }if(response.authority.length > 0){
                    cache.set(key,  answer, response.authority[0].ttl * 1000);//seconds to miliseconds
                }                
                else{
                    var tmp = answer;
                   // cache.set(key,  response.answer);
                }
                response.send();                
                next();
            });
            
            req.on('end', function () {        
            
                
            });
            
            req.send();
        }
    });
}


function runLocalDnsResponse(request, response){
console.log("[BLOCK] dns lookup: " + request.question[0].name);
    response.answer.push(dns.A({
        name: request.question[0].name,
        address: '127.0.0.1',
        ttl: 10,
    }));  
    
    response.send();       
}

var safeRequesters = [
    "LOCALHOST",
    "00-15-5d-00-12-01"
];

//cache domain rule lookups per group/mac
//create a domain tree structure and assign access rules to nodes on the way through 
var rules = {
    
    "enabled" : ["LOCALHOST", "00-15-5d-00-12-01"],
    
    "domains" : {
        "com" : {
            "domains" :{
                "twitter" :{
                    "disabled" : ["*"]
                },
                "ubuntu" : {
                    "domains" : {
                        
                        "assets" :{
                            "disabled" :  [
                             "00-15-5d-00-12-01"
                            ]        
                        }
                    }    
                }
            }
        }
    }
};

function isEnabled(domain, user){
    var parts = domain.split('.');
    var rule = rules;

    function test(rule){
        
        if(rule.disabled && rule.disabled.indexOf(user)>-1){
            return false;
        }

        var p = parts.pop();
        if(p)
        {
            var pRule = rule.domains[p] || rule.domains["*"];
            if(pRule){
                var res = test(pRule);
                if(res !== null){
                    return res;
                }
            }
        }

        if(rule.enabled && rule.enabled.indexOf(user)>-1){
            return true;
        }

         return null;
    }


    return test(rule) || false;
}

  
server.on('request', function (request, response) {
    //check the safe requesters, if they are currently allowed access then proxy out the dns request, else send the local host response and

    var ipAddress = request.address.address;
    getMac(ipAddress, function(err, mac){
        if(isEnabled(request.question[0].name, mac)){

            runRealDnsRquest(request, response);
        }else{
            
            runLocalDnsResponse(request, response);
        }
    });
});


server.serve(53);