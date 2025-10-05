import dayjs from "dayjs";

import getHistoricalExchangeRate from "./getHistoricalExchangeRate.js";

// Funzione per ottenere il tasso di cambio più recente
export default function() {
    const yesterdayDateString = dayjs(dayjs().format('YYYY-MM-DD')).subtract(1, 'day').format('YYYY-MM-DD');
    return  getHistoricalExchangeRate(yesterdayDateString);
}
