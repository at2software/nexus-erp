let lastTrackId = 0;

export const nextTrackId = (): number => ++lastTrackId;
