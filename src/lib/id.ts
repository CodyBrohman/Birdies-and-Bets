/** Collision-resistant local id. No crypto dependency; ids never leave the device. */
export function newId(prefix: string = 'id'): string {
  const time = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${time}${rand}`;
}
