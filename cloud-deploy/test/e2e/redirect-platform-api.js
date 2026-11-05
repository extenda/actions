// Loaded with `node --import` before the built action in an emulated run.
// Requests to platform-api go to a local server instead. Every other
// connection that leaves the machine is refused and recorded, so the run can
// never reach a real system.
import fs from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';

const PLATFORM_API_HOST = 'platform-api.retailsvc.com';
const LOCAL_HOSTS = ['127.0.0.1', '::1', 'localhost'];
const TRIVY_RELEASE =
  /^https:\/\/api\.github\.com\/repos\/aquasecurity\/trivy\/releases\/tags\/(v.+)$/;

const httpsRequest = https.request;
https.request = (target, ...rest) => {
  if (target?.hostname !== PLATFORM_API_HOST) {
    return httpsRequest(target, ...rest);
  }
  return http.request(
    {
      ...target,
      protocol: 'http:',
      hostname: '127.0.0.1',
      host: undefined,
      port: process.env.EMULATED_PLATFORM_API_PORT,
      agent: undefined,
    },
    ...rest,
  );
};

// The action asks GitHub whether the Trivy version exists.
const globalFetch = globalThis.fetch;
globalThis.fetch = async (target, ...rest) => {
  const release = TRIVY_RELEASE.exec(`${target}`);
  return release
    ? Response.json({ tag_name: release[1] })
    : globalFetch(target, ...rest);
};

const connectionHost = (args) => {
  // net.connect() passes its arguments on as one normalized array.
  const [first, second] = Array.isArray(args[0]) ? args[0] : args;
  if (typeof first === 'object') {
    return first.path ? 'localhost' : first.host || 'localhost';
  }
  return typeof second === 'string' ? second : 'localhost';
};

const { connect } = net.Socket.prototype;
net.Socket.prototype.connect = function guardedConnect(...args) {
  const host = connectionHost(args);
  if (!LOCAL_HOSTS.includes(host)) {
    fs.appendFileSync(process.env.EMULATED_REFUSED_LOG, `${host}\n`);
    process.nextTick(() =>
      this.destroy(new Error(`Emulated run: refused to connect to ${host}`)),
    );
    return this;
  }
  return connect.apply(this, args);
};
