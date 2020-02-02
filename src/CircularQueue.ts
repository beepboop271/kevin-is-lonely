export default class CircularQueue<T> {
  readonly size: number;

  private _queue: Array<T|null>;
  private _readIdx: number;
  private _writeIdx: number;

  constructor(size: number) {
    this.size = size;

    this._queue = new Array(size).fill(null);
    this._readIdx = 0;
    this._writeIdx = 0;
  }

  enqueue(element: T): void {
    if (this._queue[this._writeIdx]) {
      throw new Error("Queue is full");
    }
    this._queue[this._writeIdx] = element;
    this._writeIdx = (this._writeIdx+1) % this.size;
  }

  dequeue(): T {
    if (!this._queue[this._readIdx]) {
      throw new Error("Queue is empty");
    }
    let element: T = this._queue[this._readIdx]!;
    this._queue[this._readIdx] = null;
    this._readIdx = (this._readIdx+1) % this.size;
    return element;
  }

  available(): boolean {
    return (this._queue[this._readIdx] != null);
  }
}