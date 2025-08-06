'use client'

import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { X, Copy, ExternalLink, Smartphone, Users, QrCodeIcon } from 'lucide-react'

interface QRCodeDisplayProps {
  code: string
  onClose: () => void
}

export default function QRCodeDisplay({ code, onClose }: QRCodeDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const joinUrl = `${window.location.origin}/join?code=${code}`

  useEffect(() => {
    generateQRCode()
  }, [code])

  const generateQRCode = () => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const size = 280
    canvas.width = size
    canvas.height = size

    // Clear canvas with white background
    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, size, size)

    // Enhanced QR code pattern
    ctx.fillStyle = 'black'
    const moduleSize = size / 29

    // Create pattern based on code
    for (let i = 0; i < 29; i++) {
      for (let j = 0; j < 29; j++) {
        const shouldFill = (i + j + code.charCodeAt(0) + code.charCodeAt(1)) % 3 === 0
        if (shouldFill) {
          ctx.fillRect(i * moduleSize, j * moduleSize, moduleSize, moduleSize)
        }
      }
    }

    // Add corner squares (QR code position markers)
    const cornerSize = moduleSize * 7
    
    // Top-left corner
    ctx.fillStyle = 'black'
    ctx.fillRect(0, 0, cornerSize, cornerSize)
    ctx.fillStyle = 'white'
    ctx.fillRect(moduleSize, moduleSize, cornerSize - 2 * moduleSize, cornerSize - 2 * moduleSize)
    ctx.fillStyle = 'black'
    ctx.fillRect(2 * moduleSize, 2 * moduleSize, cornerSize - 4 * moduleSize, cornerSize - 4 * moduleSize)

    // Top-right corner
    ctx.fillStyle = 'black'
    ctx.fillRect(size - cornerSize, 0, cornerSize, cornerSize)
    ctx.fillStyle = 'white'
    ctx.fillRect(size - cornerSize + moduleSize, moduleSize, cornerSize - 2 * moduleSize, cornerSize - 2 * moduleSize)
    ctx.fillStyle = 'black'
    ctx.fillRect(size - cornerSize + 2 * moduleSize, 2 * moduleSize, cornerSize - 4 * moduleSize, cornerSize - 4 * moduleSize)

    // Bottom-left corner
    ctx.fillStyle = 'black'
    ctx.fillRect(0, size - cornerSize, cornerSize, cornerSize)
    ctx.fillStyle = 'white'
    ctx.fillRect(moduleSize, size - cornerSize + moduleSize, cornerSize - 2 * moduleSize, cornerSize - 2 * moduleSize)
    ctx.fillStyle = 'black'
    ctx.fillRect(2 * moduleSize, size - cornerSize + 2 * moduleSize, cornerSize - 4 * moduleSize, cornerSize - 4 * moduleSize)

    // Add center logo area
    const centerSize = moduleSize * 5
    const centerX = (size - centerSize) / 2
    const centerY = (size - centerSize) / 2
    
    ctx.fillStyle = 'white'
    ctx.fillRect(centerX, centerY, centerSize, centerSize)
    ctx.fillStyle = 'black'
    ctx.strokeRect(centerX, centerY, centerSize, centerSize)
    
    // Add "QM" text in center
    ctx.fillStyle = 'black'
    ctx.font = `${moduleSize * 1.5}px Arial`
    ctx.textAlign = 'center'
    ctx.fillText('QM', size / 2, size / 2 + moduleSize * 0.5)
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in-0 duration-300">
      <Card className="w-full max-w-lg bg-white/95 backdrop-blur-sm shadow-2xl border-0 animate-in zoom-in-95 duration-300">
        <CardHeader className="relative text-center pb-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClose}
            className="absolute right-2 top-2 hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </Button>
          <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <QrCodeIcon className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-2xl text-gray-800">Join Quiz Session</CardTitle>
          <p className="text-gray-600">Scan the QR code or use the game code below</p>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* QR Code */}
          <div className="text-center">
            <div className="bg-white p-6 rounded-2xl inline-block shadow-lg border-2 border-gray-100">
              <canvas ref={canvasRef} className="rounded-lg" />
            </div>
            <p className="text-sm text-gray-500 mt-3 flex items-center justify-center gap-2">
              <Smartphone className="h-4 w-4" />
              Scan with your phone camera
            </p>
          </div>

          {/* Game Code */}
          <div className="text-center space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-3">Or enter this code manually:</p>
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-2xl border border-blue-200">
                <p className="text-4xl font-bold font-mono tracking-wider text-gray-800 mb-2">{code}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(code)}
                  className="border-blue-300 text-blue-700 hover:bg-blue-50"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Code
                </Button>
              </div>
            </div>
          </div>

          {/* Join URL */}
          <div className="space-y-3">
            <p className="text-sm text-gray-600 font-medium">Direct link:</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={joinUrl}
                readOnly
                className="flex-1 px-4 py-3 text-sm border border-gray-300 rounded-lg bg-gray-50 text-gray-700 font-mono"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(joinUrl)}
                className="px-4"
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(joinUrl, '_blank')}
                className="px-4"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-2xl border border-green-200">
            <div className="flex items-center gap-3 mb-3">
              <Users className="h-6 w-6 text-green-600" />
              <h3 className="font-semibold text-green-800">How to Join</h3>
            </div>
            <ul className="text-sm text-green-700 space-y-2">
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                Open camera app and scan the QR code
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                Or visit the join page and enter the code
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                Choose a nickname and start playing!
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
