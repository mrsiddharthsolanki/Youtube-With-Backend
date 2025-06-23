const asyncHandler = (requestHendler) => {
    return (req, res, next) => {
        Promise
            .resolve(requestHendler(req,res,next))
            .catch( (err) => next(err))
    }
} 


export {asyncHandler};

//! using the await and async function higer oder funcation

// const asyncHandler = (requestHendler) => async(req, res, next) => {
//     try {
//         await requestHendler(req, res, next);
//     } catch (error) {
//         req.sastus(error.code || 500).json({
//             success: false,
//             message: error.message
//         })
//     }
// }