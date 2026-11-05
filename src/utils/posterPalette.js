// Art palette from the supplied posters, separate from the scientific CPK swatches.
const colors = { S: '#f6cd16', Re: '#dc419e', H: '#edf0ed', N: '#087ad3', Sn: '#54595d', I: '#7425bc', Na: '#f4cb19', B: '#c92e78', P: '#f58a12', U: '#41a84b', As: '#4caa48', Am: '#7625ad', K: '#087ad3' };
export const posterColorFor = element => colors[element.symbol] || element.color || '#e8d3a0';
