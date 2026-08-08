export function getNoteBackgroundColor(color: string, backgroundColor?: string) {
  if (backgroundColor) {
    return `color-mix(in srgb, ${color} 26.6667%, ${backgroundColor})`;
  }
  return `${color}44`;
}

export function getNoteBorderColor(color: string) {
  return `${color}66`;
}
