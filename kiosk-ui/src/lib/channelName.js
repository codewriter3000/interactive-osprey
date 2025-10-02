const getChannelName = (number) => {
    const predefinedChannelNames = {
        5264: "WTTG",
        5260: "WRC-TV",
        5250: "KTVT",
        5230: "KOVR",
        5220: "KDKA-TV",
        5210: "KYW-TV",
        5180: "WCBS-TV",
        5170: "WCCO-TV",
    }
    return predefinedChannelNames[number] || null;
}

export { getChannelName };