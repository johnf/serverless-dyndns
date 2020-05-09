# Route53 DynDNS Compatible Dynamic DNS

This will deploy a DynDNS compatible endpoint into your account that can create
Dynamic DNS entries in your Route 53 hosted zones.

This means it will work with `dclient` or any device that supports DynDNS and
let's you set the server name to connect to. I'm using it on Unifi Gateways.

The endpoint is quote basic and only supports one username/password combination
and requires that the zones are in the same account.

## Deploy

First create the configuration by filling out the following in `.env.production`
``` bash
API_HOSTNAME=dyndns.example.com
API_ZONENAME=example.com
USERNAME=admin
PASSWORD=CREATE_A_RANDOM_PASSWORD_HERE
HOSTNAMES="vpn.example.com,foo.example.org"
```

Next create certificate, map the domain and deploy
``` bash
yarn create_cert
yarn create_domain
yarn deploy
```

## Configuration

* **API_HOSTNAME** - Where the endpoint will live e.g.  https://dyndns.example.com
* **API_ZONENAME** - The Route 53 Zone Name that the above lives in
* **USERNAME** - The username for clients
* **PASSWORD** - The password for clients
* **HOSTNAMES** - A comma delimited list of hostnames that are allowed to be updated
