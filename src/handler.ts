import express from 'express';
import basicAuth from 'express-basic-auth';
import serverlessExpress from '@vendia/serverless-express';
import { Route53Client, ListHostedZonesCommand, ChangeResourceRecordSetsCommand } from '@aws-sdk/client-route-53';

const { DYNDNS_USERNAME, DYNDNS_PASSWORD, HOSTNAMES } = process.env as Record<string, string | undefined>;

if (!DYNDNS_USERNAME) {
  throw new Error('DYNDNS_USERNAME not set');
}

if (!DYNDNS_PASSWORD) {
  throw new Error('DYNDNS_PASSWORD not set');
}

if (!HOSTNAMES) {
  throw new Error('HOSTNAMES not set');
}

const users = {
  [DYNDNS_USERNAME]: DYNDNS_PASSWORD,
};
const hostnames = HOSTNAMES.split(/,/);

const unauthorizedResponse = (req: any) => (req.auth ? 'Credentials rejected' : 'No credentials provided'); // eslint-disable-line @typescript-eslint/no-explicit-any

const app = express();
app.use(basicAuth({ users, unauthorizedResponse }));

app.get('/nic/update', async (req, res) => {
  console.debug('HOSTNAMES', hostnames);
  console.debug('QUERY', req.query);

  const { hostname, myip } = req.query as Record<string, string | undefined>;
  if (!hostname) {
    return res.send('ERROR: no hostname provided');
  }

  const ip = myip || (req.headers['x-forwarded-for'] && (req.headers['x-forwarded-for'] as string).split(/\s*,\s*/)[0]) || req.socket.remoteAddress;

  if (!hostnames.includes(hostname as string)) {
    console.error(`${hostname} not authorised`);
    return res.send(`ERROR: ${hostname} not allowed`);
  }

  const domainName = hostname.replace(/^[^.]+\./, '');

  const client = new Route53Client({});
  const listCommand = new ListHostedZonesCommand({});

  return client.send(listCommand)
    .then(({ HostedZones: zones }) => {
      const zone = (zones || []).find((z) => z.Name === `${domainName}.`);
      if (!zone) {
        console.error(`${domainName} not in route53`);
        throw new Error(`ERROR: ${domainName} not in Route53`);
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

      return client.send(updateCommand);
    })
    .then(() => res.send(`good ${ip}`))
    .catch((err) => res.send(err.message));
});

export const handler = serverlessExpress({ app });
