import express from 'express';
import serverless from 'serverless-http';
import basicAuth from 'express-basic-auth';
import { Route53Client, ListHostedZonesCommand, ChangeResourceRecordSetsCommand } from '@aws-sdk/client-route-53';


const { USERNAME, PASSWORD, HOSTNAMES } = process.env;

const users = {};
users[USERNAME] = PASSWORD;
const hostnames = HOSTNAMES.split(/,/);


const unauthorizedResponse = (req) => (req.auth ? 'Credentials rejected' : 'No credentials provided');

const app = express();
app.use(basicAuth({ users, unauthorizedResponse }));

const update = async (req, res) => {
  console.debug('HOSTNAMES', hostnames);
  console.debug('QUERY', req.query);

  const { hostname, myip } = req.query;

  const ip = myip || (req.headers['x-forwarded-for'] && req.headers['x-forwarded-for'].split(/\s*,\s*/)[0]) || req.connection.remoteAddress;

  if (!hostnames.includes(hostname)) {
    console.error(`${hostname} not authorised`);
    return res.send(`ERROR: ${hostname} not allowed`);
  }

  const domainName = hostname.replace(/^[^.]+\./, '');

  const client = new Route53Client({});
  const listCommand = new ListHostedZonesCommand({});
  const results = await client.send(listCommand);
  const zones = results.HostedZones;

  const zone = zones.find((z) => z.Name === `${domainName}.`);
  if (!zone) {
    console.error(`${domainName} not in route53`);
    return res.send(`ERROR: ${domainName} not in Route53`);
  }

  const params = {
    HostedZoneId: zone.Id,
    ChangeBatch: {
      Changes: [{
        Action: 'UPSERT',
        ResourceRecordSet: {
          Name: `${hostname}.`,
          Type: 'A',
          TTL: 60,
          ResourceRecords: [{ Value: ip }],
        },
      }],
    },
  };

  const updateCommand = new ChangeResourceRecordSetsCommand(params);

  return client.send(updateCommand)
    .then(() => res.send(`good ${ip}`));
};

app.get('/nic/update', update);
app.get('/v3/update', update);

export const dyndns = serverless(app);
export const foo = true;
