'use strict';

// Confirmed from dlb0003 Phase 1 scan — Nordic UART service with custom TX char
const BLE_SERVICE = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
const BLE_CHAR    = '6e40fff6-b5a3-f393-e0a9-e50e24dcca9e';

// Segment byte encoding (confirmed):
//   inner single n : byte = n          (0x01–0x14, 1–20)
//   outer single n : byte = n + 20     (0x15–0x28, 21–40)
//   double n       : byte = n + 40     (0x29–0x3c, 41–60)
//   triple n       : byte = n + 60     (0x3d–0x50, 61–80)
//   bull outer 25  : byte = 0x51 (81)
//   bull inner 50  : byte = 0x52 (82)
//   miss           : byte = 0x00

class DartsLiveBLE extends EventTarget {
  constructor() {
    super();
    this.device = null;
    this.server = null;
    this.char   = null;
  }

  get connected() {
    return this.device?.gatt?.connected ?? false;
  }

  // Opens the Chrome device picker, connects, and starts notifications.
  // Fires 'connect' (detail: { name }) on success.
  // Returns the device name string.
  async connect() {
    const device = await navigator.bluetooth.requestDevice({
      filters: [
        { namePrefix: 'DARTSLIVE' },
        { namePrefix: 'DL-HOME'   },
        { namePrefix: 'DL'        },
        { namePrefix: 'PHOENIX'   },
        { namePrefix: 'Phoenix'   },
      ],
      optionalServices: [BLE_SERVICE],
    });

    this.device = device;
    device.addEventListener('gattserverdisconnected', () => {
      this.dispatchEvent(new CustomEvent('disconnect'));
    });

    this.server = await device.gatt.connect();
    const svc   = await this.server.getPrimaryService(BLE_SERVICE);
    this.char   = await svc.getCharacteristic(BLE_CHAR);
    this.char.addEventListener('characteristicvaluechanged', this._onNotify.bind(this));
    await this.char.startNotifications();

    this.dispatchEvent(new CustomEvent('connect', { detail: { name: device.name } }));
    return device.name;
  }

  async disconnect() {
    if (this.device?.gatt?.connected) this.device.gatt.disconnect();
    this.device = null;
    this.server = null;
    this.char   = null;
  }

  _onNotify(e) {
    const bytes = new Uint8Array(e.target.value.buffer);
    const seg = DartsLiveBLE.parseDart(bytes);
    if (seg) this.dispatchEvent(new CustomEvent('dart', { detail: seg }));
  }

  // Parse a raw notification payload.
  // Returns a segment object, or null if this is not a dart-hit frame.
  static parseDart(bytes) {
    if (bytes.length !== 5 || bytes[0] !== 0xA2 || bytes[1] !== 0x03) return null;
    return DartsLiveBLE.decodeSegmentByte(bytes[2]);
  }

  // Decode one segment byte into { number, multiplier, score, zone, label }.
  //   number     — dartboard number (1–20, or 25 for bull)
  //   multiplier — 1 single | 2 double | 3 triple
  //   score      — points (number × multiplier)
  //   zone       — 'single' | 'double' | 'triple' | 'bull' | 'dbull' | 'miss'
  //   label      — display string e.g. 'T20', 'D1', 'S5', 'BULL', 'DBULL', 'MISS'
  static decodeSegmentByte(b) {
    if (b === 0)    return { number: 0,    multiplier: 0, score: 0,        zone: 'miss',   label: 'MISS'       };
    if (b <= 20)    return { number: b,    multiplier: 1, score: b,        zone: 'single', label: `S${b}`      };
    if (b <= 40)    return { number: b-20, multiplier: 1, score: b-20,     zone: 'single', label: `S${b-20}`   };
    if (b <= 60)    return { number: b-40, multiplier: 2, score: (b-40)*2, zone: 'double', label: `D${b-40}`   };
    if (b <= 80)    return { number: b-60, multiplier: 3, score: (b-60)*3, zone: 'triple', label: `T${b-60}`   };
    if (b === 0x51) return { number: 25,   multiplier: 1, score: 25,       zone: 'bull',   label: 'BULL'       };
    if (b === 0x52) return { number: 25,   multiplier: 2, score: 50,       zone: 'dbull',  label: 'DBULL'      };
    return null;
  }
}
