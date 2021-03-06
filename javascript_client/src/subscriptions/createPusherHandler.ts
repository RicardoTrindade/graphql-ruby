import { Pusher } from "pusher-js"
// TODO:
// - end-to-end test
// - extract update code, inject it as a function?
interface PusherHandlerOptions {
  pusher: Pusher,
  fetchOperation: Function
}

function createPusherHandler(options: PusherHandlerOptions) {
  var pusher = options.pusher
  var fetchOperation = options.fetchOperation
  return function (operation: object, variables: object, cacheConfig: object, observer: { onNext: Function, onError: Function, onCompleted: Function}) {
    var channelName: string
    // POST the subscription like a normal query
    fetchOperation(operation, variables, cacheConfig).then(function(response: { headers: { get: Function } }) {
      channelName = response.headers.get("X-Subscription-ID")
      var channel = pusher.subscribe(channelName)
      // When you get an update from pusher, give it to Relay
      channel.bind("update", function(payload) {
        // TODO Extract this code
        // When we get a response, send the update to `observer`
        const result = payload.result
        if (result && result.errors) {
          // What kind of error stuff belongs here?
          observer.onError(result.errors)
        } else if (result) {
          observer.onNext({data: result.data})
        }
        if (!payload.more) {
          // Subscription is finished
          observer.onCompleted()
        }
      })
    })
    return {
      dispose: function() {
        pusher.unsubscribe(channelName)
      }
    }
  }
}

export {
  createPusherHandler,
  PusherHandlerOptions
}
