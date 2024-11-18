async function SubGetTokens(wallet) {
    console.log("using sub", wallet)
    const url = `http://doublebay.boats/TokenBal?wallet=${wallet}`;

    try {
        const response = await fetch(url); // Await the fetch call
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const data = await response.json(); // Await the JSON parsing
        return data; // Return the result
    } catch (error) {
        console.error("Error:", error);
        throw error; // Re-throw the error so it can be handled by the caller
    }
}

module.exports = SubGetTokens;