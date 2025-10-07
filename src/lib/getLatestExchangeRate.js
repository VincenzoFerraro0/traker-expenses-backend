import dayjs from "dayjs"
import getHistoricalExchangeRate from "./getHistoricalExchangeRate.js";

export default function (){
    const yesterdayDateString = dayjs(dayjs().format('YYYY-MM-DD')).subtract(1, 'day').format('YYYY-MM-DD');
    return getHistoricalExchangeRate(yesterdayDateString);
}