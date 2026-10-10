import hashlib
p=0xFFFFFFFEFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF00000000FFFFFFFFFFFFFFFF;a=p-3
G=(0x32C4AE2C1F1981195F9904466A39C9948FE30BBFF2660BE1715A4589334C74C7,0xBC3736A2F4F6779C59BDCEE36B692153D0A9877CC62A474002DF32E52139F0A0)
def add(P,Q):
 if P is None:return Q
 if Q is None:return P
 if P[0]==Q[0] and (P[1]+Q[1])%p==0:return None
 l=((3*P[0]*P[0]+a)*pow(2*P[1],-1,p) if P==Q else (Q[1]-P[1])*pow(Q[0]-P[0],-1,p))%p
 x=(l*l-P[0]-Q[0])%p;return(x,(l*(P[0]-x)-P[1])%p)
def mul(k,P):
 R=None
 while k:
  if k&1:R=add(R,P)
  P=add(P,P);k>>=1
 return R
b=lambda v:v.to_bytes(32,'big');sm3=lambda m:hashlib.new('sm3',m).digest()
d=0x3945208F7B2144B13F36E38AC6D39F95889393692860B51A42FB81EF4DF7C5B8;k=0x59276E27D506861A16680F3AD9C02DCFBFBF904F533DA0AC2EE1C9A45B58FF85
M=b'encryption standard';P=mul(d,G);C1=mul(k,G);x2,y2=mul(k,P)
t=b''.join(sm3(b(x2)+b(y2)+i.to_bytes(4,'big')) for i in range(1,2))[:len(M)]
C2=bytes(x^y for x,y in zip(M,t));C3=sm3(b(x2)+M+b(y2))
print((b(C1[0])+b(C1[1])+C3+C2).hex().upper())
