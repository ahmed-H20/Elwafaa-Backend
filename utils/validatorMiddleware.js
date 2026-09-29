import { validationResult } from "express-validator";

const validatorMiddleware = (req, res, next) => {
	const error = validationResult(req);
	if (process.env.NODE_ENV === "development") console.log(error);

	if (!error.isEmpty()) {
		return res.status(400).json({ errors: error.array() });
	}
	next();
};

export default validatorMiddleware;
