package main

import (
	"encoding/json"
	"log"
	"net"
	"net/http"
	"os"
	"strings"
	"time"
)

type ipResponse struct {
	IP     string `json:"ip"`
	Source string `json:"source"`
}

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/server/public-ip", ipHandler)
	mux.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		if _, err := w.Write([]byte("ok")); err != nil {
			log.Printf("healthz write failed: %v", err)
		}
	})

	handler := withCORS(mux)

	server := &http.Server{
		Addr:              ":" + port,
		Handler:           handler,
		ReadHeaderTimeout: 5 * time.Second,
	}

	log.Printf("plumber server listening on %s", server.Addr)
	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("server error: %v", err)
	}
}

func ipHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusNoContent)
		return
	}

	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	ip, source := extractClientIP(r)

	if ip == "" {
		http.Error(w, "unable to determine client IP", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(ipResponse{IP: ip, Source: source}); err != nil {
		log.Printf("encode error: %v", err)
	}
}

func extractClientIP(r *http.Request) (string, string) {
	headerOrder := []struct {
		header string
		source string
	}{
		{"X-Forwarded-For", "x-forwarded-for"},
		{"X-Real-IP", "x-real-ip"},
	}

	for _, candidate := range headerOrder {
		if value := parseIPFromList(r.Header.Get(candidate.header)); value != "" {
			return value, candidate.source
		}
	}

	host, _, err := net.SplitHostPort(strings.TrimSpace(r.RemoteAddr))
	if err == nil && net.ParseIP(host) != nil {
		return host, "remote-addr"
	}

	if ip := net.ParseIP(strings.TrimSpace(r.RemoteAddr)); ip != nil {
		return ip.String(), "remote-addr"
	}

	return "", ""
}

func parseIPFromList(value string) string {
	if value == "" {
		return ""
	}

	for _, part := range strings.Split(value, ",") {
		part = strings.TrimSpace(part)
		if ip := net.ParseIP(part); ip != nil {
			return ip.String()
		}
	}

	return ""
}

func withCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}
