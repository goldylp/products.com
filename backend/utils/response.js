const sendSuccess = (res, data, status = 200) => res.status(status).json(data);

const sendError = (res, status, error) => res.status(status).json({ error });

module.exports = {
  sendSuccess,
  sendError
};
