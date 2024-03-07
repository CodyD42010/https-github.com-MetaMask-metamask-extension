/**
 * Enum representing the possible states of the parser.
 */
enum State {
  Start,
  Key,
  Value,
  Comment,
}

// Define constants for ASCII values of special characters
const openBracket = 0x5b; // [
const closeBracket = 0x5d; // ]
const equalSign = 0x3d; // =
const newline = 0x0a; // \n
const space = 0x20; // ' '
const carriageReturn = 0x0d; // \r
const tab = 0x09; // \t
const semicolon = 0x3b; // ;
const hash = 0x23; // #

/**
 * A set of whitespace ASCII values for easy reference in trimming operations.
 */
const whitespace = new Set([newline, space, tab, carriageReturn]);

/**
 * Trims whitespace characters from both ends of a buffer.
 * @param buf - The buffer to trim.
 * @returns A new buffer trimmed of leading and trailing whitespace characters.
 */
function trimBuffer(buf: Buffer): Buffer {
  let start = 0,
    end = buf.length - 1;
  // Find the first non-whitespace character from the start
  while (start <= end && whitespace.has(buf[start])) start++;
  // Find the first non-whitespace character from the end
  while (end >= start && whitespace.has(buf[end])) end--;
  // Create a new buffer from the determined start and end
  return buf.subarray(start, end + 1);
}

/**
 * Generator function that parses the given buffer into sections, keys, and values.
 * @param data - The buffer containing the data to parse.
 * @yields A tuple containing the section name (if any), key, and value.
 */
export function* parse(data: Buffer) {
  // initialize parsing state
  let state: State = State.Start;
  let sectionName: Buffer | null = null;
  let partStart = -1;
  const current = { key: null as Buffer | null, value: [] as Buffer[], safeValue: null as Buffer | null };

  /**
   * Resets the current state and prepares the key-value data for yielding.
   * @returns {[Buffer | null, Buffer, Buffer | null]} The section name, key, and value to yield.
   */
  function emit(): {section: Buffer | null, key: Buffer, value: Buffer} {
    const key = current.key!;
    const value = current.safeValue!;
    resetState();
    return { section: sectionName, key, value};
  }
  function prepareEmit(){
    const { value } = current;
    let trimmedValue: Buffer;
    if (value.length === 1) {
      trimmedValue = trimBuffer(current.value[0]);
    } else {
      trimmedValue = trimBuffer(Buffer.concat(current.value));
    }
    if (trimmedValue.byteLength === 0){
      return false;
    } else {
      current.safeValue = trimmedValue;
      return true;
    }
  }
  function resetState(){
    current.key = null;
    current.value.length = 0;
    partStart = -1;
  }

  // Parse the buffer
  const length = data.length;
  for (let pos = 0; pos < length; pos++) {
    const char = data[pos];
    switch (state) {
      case State.Start:
        if (char === openBracket) {
          const endIndex = data.indexOf(closeBracket, pos);
          if (endIndex !== -1) {
            sectionName = data.subarray(pos + 1, endIndex);
            pos = endIndex;
            break;
          }
        }
        if (char === semicolon || char === hash) {
          state = State.Comment;
        } else if (!whitespace.has(char)) {
          partStart = pos;
          state = State.Key;
        }
        break;
      case State.Key:
        if (char === equalSign) {
          current.key = data.subarray(partStart, pos);
          partStart = pos + 1;
          state = State.Value;
        } else if (char === newline || pos === data.length - 1) {
          current.key = data.subarray(
            partStart,
            pos + (pos === data.length - 1 ? 1 : 0),
          );
          prepareEmit() ? void (yield emit()) : resetState();
          state = State.Start;
        }
        break;
      case State.Value:
        if (char === newline) {
          if (partStart !== pos) { // don't include zero-length values
            current.value.push(data.subarray(partStart, pos));
          }
          prepareEmit() ? void (yield emit()) : resetState();
          state = State.Start;
        }
        break;
      case State.Comment:
        // Loop until the end of the line or the end of the file is reached
        while (pos < length && data[pos] !== newline) {
          pos++;
        }
        // If a newline character is found, move to the next character and switch
        // back to the Start state to continue parsing the next line.
        // It's not necessary to check for the end of file here explicitly, as the
        // for loop's condition will handle it.
        if (pos < length && data[pos] === newline) {
          state = State.Start;
        }
        break;
    }

    if (
      state !== State.Comment &&
      char !== newline &&
      pos !== data.length - 1
    ) {
      if (partStart === -1) partStart = pos;
    } else if (state === State.Value && pos === data.length - 1) {
      // Edge case for values ending at the end of the data
      current.value.push(data.subarray(partStart, data.length));
      prepareEmit() ? void (yield emit()) : resetState();
    }
  }

  // Handle any final data not yet emitted
  if (state === State.Value && partStart !== -1 && partStart !== data.length) {
    current.value.push(data.subarray(partStart));
    prepareEmit() ? void (yield emit()) : resetState();
  }
}
