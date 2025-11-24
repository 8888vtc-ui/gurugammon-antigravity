package main

import (
	"flag"
	"log"
	"strconv"

	"codeberg.org/tslocum/bgammon/pkg/server"
)

func main() {
	dev := flag.Bool("dev", false, "Enable development mode (currently informational)")
	port := flag.Int("port", 8081, "Port for the WebSocket server")
	flag.Parse()

	_ = dev // reserved for future tuning if needed

	op := &server.Options{
		ResetSalt:     "dev-reset-salt",
		PasswordSalt:  "dev-password-salt",
		IPAddressSalt: "dev-ip-salt",
	}

	s := server.NewServer(op)

	addr := ":" + strconv.Itoa(*port)
	log.Printf("Starting bgammon WebSocket server on %s", addr)

	s.Listen("ws", addr)

	select {}
}
