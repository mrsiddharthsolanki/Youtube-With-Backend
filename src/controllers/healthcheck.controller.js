
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const healthcheck = asyncHandler(async (_, res) => {
    //TODO: build a healthcheck response that simply returns the OK status as json with a message

    return res.status(200).json(
        ApiResponse(
            200,
            "ok",
            "Healthcheck successful"
        )
    );

})

export {
        healthcheck
    }
    