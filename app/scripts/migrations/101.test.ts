import { migrate, version } from './101';

const oldVersion = 100;

describe('migration #101', () => {
  it('updates the version metadata', async () => {
    const oldStorage = {
      meta: { version: oldVersion },
      data: {},
    };

    const newStorage = await migrate(oldStorage);

    expect(newStorage.meta).toStrictEqual({ version });
  });

  it('should do nothing if isLineaMainnetReleased state does not exist', async () => {
    const oldStorage = {
      meta: { version: oldVersion },
      data: {
        PreferencesController: {
          bar: 'baz',
        },
        foo: 'bar',
      },
    };

    const newStorage = await migrate(oldStorage);
    expect(oldStorage.data).toStrictEqual(newStorage.data);
  });

  it('should delete isLineaMainnetReleased state', async () => {
    const oldStorage = {
      meta: { version: oldVersion },
      data: {
        PreferencesController: {
          isLineaMainnetReleased: true,
          bar: 'baz',
        },
        foo: 'bar',
      },
    };

    const newStorage = await migrate(oldStorage);
    expect(newStorage.data).toStrictEqual({
      PreferencesController: {
        bar: 'baz',
      },
      foo: 'bar',
    });
  });
});
