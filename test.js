const moment=require('moment')
var check = moment(Date.now());

var month = check.format('M');
var day   = check.format('D');
var year  = check.format('YYYY');

console.log(month)
console.log(day)
console.log(year)