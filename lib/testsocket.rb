require 'time'
require './lib/websocket'

class AppSocket < WebSocketHelper
    def on_ping(data)
        self.send('pong', Time.now.iso8601)
    end
end