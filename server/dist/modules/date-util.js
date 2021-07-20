"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLocalDate = exports.getDateString = void 0;
exports.getDateString = (date) => {
    return `${date.getFullYear()}-${fillZero(2, (date.getMonth() + 1).toString())}-${fillZero(2, date.getDate().toString())} ${fillZero(2, date.getHours().toString())}:${fillZero(2, date.getMinutes().toString())}:${fillZero(2, date.getSeconds().toString())}`;
};
const fillZero = (width, str) => {
    return str.length >= width ? str : new Array(width - str.length + 1).join('0') + str;
};
exports.getLocalDate = date => {
    const newDate = new Date(date);
    const offsetHour = date.getTimezoneOffset() / 60;
    newDate.setHours(date.getHours() + offsetHour);
    return newDate;
};
