import { redisStore } from '../src';
import { RedisStore } from "../src/types";
import { describe, beforeEach, it, expect, afterEach } from "vitest";

let redisClient: RedisStore
const config = {
  socket: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: 6379
  },
  password: 'redis_password',
  db: 0,
  ttl: 1000 * 60,
};

beforeEach(async () => {
  redisClient = await redisStore(config);
  await redisClient.reset();
});

afterEach(async () => {
  await redisClient.flushAll()
});

describe('Redis Store', () => {

  it('should set and get a value', async () => {
    const key = 'testKey';
    const value = 'testValue';

    await redisClient.set(key, value);
    const retrievedValue = await redisClient.get(key);

    expect(retrievedValue).toEqual(value);
  });

  it('should delete a key', async () => {
    const key = 'testKey';
    const value = 'testValue';

    await redisClient.set(key, value);
    await redisClient.del(key);

    const retrievedValue = await redisClient.get(key);
    expect(retrievedValue).toBeUndefined();
  });

  it('should set multiple values and get them', async () => {
    const keyValuePairs: [string, string][] = [['key12', 'value1'], ['key22', 'value2']];
    const ttl = 10000;

    await redisClient.mset(keyValuePairs, ttl);

    const retrievedValues = await redisClient.mget('key12', 'key22');
    expect(retrievedValues).toEqual(['value1', 'value2']);
  });

  it('should handle non-cacheable values', async () => {
    const key = 'nonCacheableKey';
    const nonCacheableValue = undefined;

    await expect(redisClient.set(key, nonCacheableValue)).rejects.toThrow(
      `"${nonCacheableValue}" is not a cacheable value`
    );
  });

  it('should handle TTL for individual keys in mset', async () => {
    const key = 'ttlKey';
    const value = 'ttlValue';
    const ttl = 10000;

    await redisClient.mset([[key, value]], ttl);

    const retrievedTtl = await redisClient.ttl(key);
    expect(retrievedTtl).toBeLessThanOrEqual(ttl / 1000); // Redis returns TTL in seconds
  });

  it('should handle TTL for individual keys in set', async () => {
    const key = 'ttlKeySet';
    const value = 'ttlValueSet';
    const ttl = 1000;

    await redisClient.set(key, value, ttl);

    const retrievedTtl = await redisClient.ttl(key);
    expect(retrievedTtl).toBeLessThanOrEqual(ttl / 1000); // Redis returns TTL in seconds
  });

  it('should increment a value', async () => {
    const key = 'testKey';
    const value = 1;

    await redisClient.set(key, value);
    const numberIncrBy = await redisClient.incrBy(key, 1);

    const retrievedValue = await redisClient.get(key);
    expect(numberIncrBy).toEqual(2);
    expect(retrievedValue).toEqual(2);
  });

  it('should return scan result by pattern', async () => {
    const key1 = 'ttl:a:b';
    const key2 = 'ttl1:a:b';
    const key3 = 'ttl:a:b1';
    const value = 'scanValueSet';
    const ttl = 10000;

    await redisClient.set(key1, value, ttl);
    await redisClient.set(key2, value, ttl);
    await redisClient.set(key3, value, ttl);

    const res = await redisClient.scan('ttl:a:*');
    expect(res.keys).toEqual([key1, key3]);

    const firstScanWithCount = await redisClient.scan('ttl:a:*', 0, 1);
    expect(firstScanWithCount.keys).toEqual([key1]);
    expect(firstScanWithCount.cursor).not.equal(0);

    const secondScanWithCount = await redisClient.scan('ttl:a:*', firstScanWithCount.cursor, 1);
    expect(secondScanWithCount.keys).toEqual([key3]);
    expect(secondScanWithCount.cursor).equal(3);

    const thirdScanWithCount = await redisClient.scan('ttl:a:*', secondScanWithCount.cursor, 1);
    expect(thirdScanWithCount.keys).toEqual([]);
    expect(thirdScanWithCount.cursor).equal(0);
  });

  it('should inc value by one', async () => {
    await redisClient.set('test', { a: 1 });
    const res = await redisClient.atomicGetAndSet('test', (obj) => {
      const parsedVal = obj;
      parsedVal.a = parsedVal.a + 1;
      return JSON.stringify(parsedVal);
    });
    expect(JSON.parse(res[1] as string)).to.deep.equal({ a: 2 });
    expect(res[0]).to.deep.equal("OK");
  })

});
