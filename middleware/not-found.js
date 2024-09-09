const notFound = (req, res, next) => {
    const error = new Error('this route does not exists');
    error.status = 404;
    next(error);
}
export default notFound;