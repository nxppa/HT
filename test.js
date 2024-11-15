function GetTime(raw) {
    const now = new Date();
  
    // Use Intl.DateTimeFormat to format time in Sydney with milliseconds
    const formatter = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      fractionalSecondDigits: 3, // Includes milliseconds
      hour12: false,
      timeZone: 'Australia/Sydney', // Specifies Sydney timezone
    });
  
    // Format the time string
    const timeString = formatter.format(now);
  
    // Add brackets if 'raw' is false
    const time = raw ? timeString : `[${timeString}]`;
  
    return time;
  }
  
  
  console.log(GetTime())