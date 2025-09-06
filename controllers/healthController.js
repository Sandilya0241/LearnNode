exports.checkHealth = (req, res) => {
    res.status(200).json({ status: 'Running', timestamp: new Date().toISOString() });
};
