const c = require('compact-encoding')

// Common Structs
const Clock = {
  preencode (state, req) {
    c.fixed32.preencode(state, req.key)
    c.uint.preencode(state, req.length)
  },
  encode (state, req) {
    c.fixed32.encode(state, req.key)
    c.uint.encode(state, req.length)
  },
  decode (state) {
    return {
      key: c.fixed32.decode(state),
      length: c.uint.decode(state)
    }
  }
}

const ClockArray = c.array(Clock)

const Clocks = {
  preencode (state, req) {
    if (!req) {
      c.uint.preencode(state, 0)
      return
    }
    c.uint.preencode(state, req.size)
    for (const seq of req.values()) {
      state.end += 32
      c.uint.preencode(state, seq)
    }
  },
  encode (state, req) {
    const arr = keyMapToArray(req)
    ClockArray.encode(state, arr)
  },
  decode (state) {
    const arr = ClockArray.decode(state)
    return keyArrayToMap(arr)
  }
}

// Input Structs

const InputNode = {
  preencode (state, req) {
    c.buffer.preencode(state, req.value)
    c.uint.preencode(state, req.batch)
    Clocks.preencode(state, req.links)
  },
  encode (state, req) {
    c.buffer.encode(state, req.value)
    c.uint.encode(state, req.batch)
    Clocks.encode(state, req.links)
  },
  decode (state) {
    return {
      value: c.buffer.decode(state),
      batch: c.uint.decode(state),
      links: Clocks.decode(state)
    }
  }
}

// Output Structs

const IndexNode = {
  preencode (state, req) {
    Clocks.preencode(state, req.clock)
    c.uint.preencode(state, req.batch || 1)
    c.buffer.preencode(state, req.value)
    c.fixed32.preencode(state, req.node.key)
    c.uint.preencode(state, req.node.seq)
  },
  encode (state, req) {
    Clocks.encode(state, req.clock)
    c.uint.encode(state, req.batch || 1)
    c.buffer.encode(state, req.value)
    c.fixed32.encode(state, req.node.key)
    c.uint.encode(state, req.node.seq)
  },
  decode (state) {
    return {
      clock: Clocks.decode(state),
      batch: c.uint.decode(state),
      value: c.buffer.decode(state),
      key: c.fixed32.decode(state),
      seq: c.uint.decode(state),
    }
  }
}

function keyMapToArray (m) {
  const arr = []
  if (!m) return arr
  for (const [k, v] of m) {
    arr.push({ key: Buffer.from(k, 'hex'), length: v })
  }
  arr.sort(compareKeys)
  return arr
}

function keyArrayToMap (arr) {
  const m = new Map()
  if (!arr) return m
  for (const { key, length } of arr) {
    m.set(key.toString('hex'), length)
  }
  return m
}

function compareKeys (a, b) {
  return Buffer.compare(a.key, b.key)
}

module.exports = {
  InputNode,
  IndexNode
}