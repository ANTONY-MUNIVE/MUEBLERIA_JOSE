// Utilidades de fecha en hora local (Perú) con formato AAAA-MM-DD,
// que permite comparar y filtrar fechas como texto.

const pad = (n) => String(n).padStart(2, '0');

export const hoyISO = (d = new Date()) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const esFechaValida = (texto) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(texto || '')) return false;
  const [y, m, d] = texto.split('-').map(Number);
  const f = new Date(y, m - 1, d);
  return f.getFullYear() === y && f.getMonth() === m - 1 && f.getDate() === d;
};

export const formatoFecha = (texto) => {
  if (!esFechaValida(texto)) return texto || '';
  const [y, m, d] = texto.split('-');
  return `${d}/${m}/${y}`;
};

export const formatoFechaHora = (valor) => {
  if (!valor) return '';
  const d = typeof valor?.toDate === 'function' ? valor.toDate() : new Date(valor);
  if (Number.isNaN(d.getTime())) return '';
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

// Lunes de la semana de la fecha dada
export const inicioSemana = (d = new Date()) => {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dia = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - dia);
  return hoyISO(x);
};

export const inicioMes = (d = new Date()) => hoyISO(new Date(d.getFullYear(), d.getMonth(), 1));
