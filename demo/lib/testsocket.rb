require 'time'
require './lib/websocket'

class AppSocket < Faye::WebSocket::Sinatra
    def on_ping(data, packet)
        if packet[:id].nil?
            self.send('pong', Time.now.iso8601)
        else
            self.reply('ping', packet[:id], Time.now.iso8601)
        end
    end
end
