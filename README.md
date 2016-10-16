# Pi-Safe
a dns proxy designed to protect your household from some of the more unsavory parts of the web

The idea of this software is that you would run it on a raspbery pi/nodejs server and setup 
your router to return the servers ip address for DHCP requests.

This software will interogate the dns request and if (based on a set of rules) it deams the 
requester (configured by MAC address) as being enabled to see the requested domain then it 
forwards the request to some real name servers (ideally configurable).

## TODO
1. log dns requests
2. disable logging/reporting based on user/mac address
3. web UI to manage assigned users->macs
4. webui to see dns request statistics displaying blocked site with the option to unblock them
5. when posible while blocking show a friendly screen letting user know theyhave been blocked (and add an unblock with password option to it.)
6. login/unblock should have the option of using a second factor/mobile verification step (like authy/duo mobile) 

## Stretch goals
1. windows service client that monitors currently logged in user and can enable/disable a 
    mac addesss mapping to a user account
 